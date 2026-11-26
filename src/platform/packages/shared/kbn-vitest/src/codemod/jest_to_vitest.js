/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Rewrites Jest test files (and package-local mocks/helpers) to Vitest APIs. `vi` is a global
 * (the presets set `globals: true`), so only types are imported from 'vitest'.
 *
 *  - jest.<api>(...)                 -> vi.<api>(...)
 *  - jest.requireActual(x)           -> await vi.importActual(x), enclosing function made async
 *  - jest.requireMock(x)             -> await vi.importMock(x), enclosing function made async
 *  - require(x) in a mock factory    -> await import(x), factory made async
 *  - require('./source') elsewhere   -> await import('./source') (Node's require can't load TS)
 *  - nested jest.mock()              -> vi.doMock() (Vitest throws for nested vi.mock())
 *  - jest.setTimeout(n)              -> vi.setConfig({ testTimeout: n })
 *  - jest.Mocked<T> & co.            -> Mocked<T> & co. imported from 'vitest'
 *  - constructor mocks               -> `function` implementations (Vitest calls them with `new`)
 *  - exported `vi.fn()` values       -> annotated with `Mock` (their inferred type can't be named)
 *  - un-awaited expect().rejects     -> awaited
 *  - (done) => {...} tests           -> Promise-returning tests
 *  - `%p` in .each titles            -> `%o`
 *  - '@fast-check/jest'              -> '@fast-check/vitest'
 *  - vi.mock(x, () => ({ ... }))     -> also exposes the object as `default` (Jest's CJS interop)
 *  - jest.isolateModules(() => { m = require(x); }) -> vi.resetModules(); m = await import(x);
 *
 * Anything without a mechanical translation is reported, not rewritten.
 */

const Fs = require('fs');
const Prettier = require('prettier');
const { Project, SyntaxKind, Node } = require('ts-morph');

const TYPE_RENAMES = {
  Mocked: 'Mocked',
  MockedFunction: 'MockedFunction',
  MockedFn: 'MockedFunction',
  MockedClass: 'MockedClass',
  MockedObject: 'MockedObject',
  MockedObjectDeep: 'Mocked',
  Mock: 'Mock',
  SpyInstance: 'MockInstance',
  MockInstance: 'MockInstance',
  Spied: 'MockInstance',
  SpiedFunction: 'MockInstance',
  SnapshotSerializerPlugin: 'SnapshotSerializer',
};
// Jest's `Mock<ReturnType, Args>` / `SpyInstance<ReturnType, Args>` take the return and argument
// types; Vitest's `Mock<Fn>` / `MockInstance<Fn>` take the function type.
const RETURN_TYPE_GENERICS = new Set(['Mock', 'SpyInstance', 'MockInstance']);
const MODULE_RENAMES = { '@fast-check/jest': '@fast-check/vitest' };
const JEST_ONLY_MODULE = /^(@jest\/|jest-|jest$)/;
const UNSUPPORTED_APIS = new Set([
  'isolateModules',
  'isolateModulesAsync',
  'createMockFromModule',
  'genMockFromModule',
  'retryTimes',
  'enableAutomock',
  'disableAutomock',
  'deepUnmock',
  'setMock',
  'replaceProperty',
  'unstable_mockModule',
  'now',
]);
const HOISTED_APIS = new Set(['mock', 'unmock']);
const IMPLEMENTATION_METHODS = new Set(['mockImplementation', 'mockImplementationOnce']);
const RETURN_VALUE_METHODS = new Set(['mockReturnValue', 'mockReturnValueOnce']);
const HOOKS = new Set(['beforeEach', 'beforeAll', 'afterEach', 'afterAll']);
const FUNCTION_KINDS = new Set([
  SyntaxKind.ArrowFunction,
  SyntaxKind.FunctionExpression,
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.MethodDeclaration,
]);
// Specifiers Node's require can load without Vitest: npm packages, except the ones the Kibana
// resolver remaps (e.g. EUI -> its test-env build).
const isBarePackageSpecifier = (specifier) =>
  !specifier.startsWith('.') &&
  !specifier.startsWith('/') &&
  !specifier.startsWith('@kbn/') &&
  !/^@elastic\/eui(\/|$)/.test(specifier);
const isClassLikeName = (name) => /^[A-Z]/.test(name) && /[a-z]/.test(name);

const createReporter = (sourceFile) => {
  const entries = [];
  const add = (kind) => (node, message) =>
    entries.push({
      file: sourceFile.getFilePath(),
      line: node.getStartLineNumber(),
      kind,
      message,
    });
  return {
    entries,
    /** Needs a manual change. */
    manual: add('manual'),
    /** Rewritten, but worth a look. */
    review: add('review'),
  };
};

const isMockCall = (call, apis = /^(jest|vi)\.(mock|doMock)$/) =>
  Node.isCallExpression(call) && apis.test(call.getExpression().getText());

const isMockFactory = (fn) => {
  const call = fn.getParentIfKind(SyntaxKind.CallExpression);
  return call !== undefined && isMockCall(call) && call.getArguments()[1] === fn;
};

const isTestCallback = (fn) => {
  const call = fn.getParentIfKind(SyntaxKind.CallExpression);
  return (
    call !== undefined &&
    /^(it|test|beforeEach|beforeAll|afterEach|afterAll)(\.(only|skip|concurrent|each\(.*\)))*$/s.test(
      call.getExpression().getText()
    )
  );
};

const enclosingFunction = (node) =>
  node.getFirstAncestor((ancestor) => FUNCTION_KINDS.has(ancestor.getKind()));

const makeEnclosingFunctionAsync = (node, reporter) => {
  const fn = enclosingFunction(node);
  if (!fn) {
    // module top level: ESM allows top-level await
    return;
  }
  if (!fn.isAsync()) {
    fn.setIsAsync(true);
    if (!isMockFactory(fn) && !isTestCallback(fn)) {
      reporter.manual(node, 'made a helper async; make its callers await it');
    }
  }
};

/** `await x` needs parentheses where it is the operand of a member access, call or cast. */
const awaited = (node, text) => {
  const parent = node.getParent();
  const needsParens =
    (Node.isPropertyAccessExpression(parent) && parent.getExpression() === node) ||
    (Node.isElementAccessExpression(parent) && parent.getExpression() === node) ||
    (Node.isCallExpression(parent) && parent.getExpression() === node) ||
    Node.isAsExpression(parent) ||
    Node.isNonNullExpression(parent) ||
    Node.isTypeAssertion(parent);
  return needsParens ? `(await ${text})` : `await ${text}`;
};

/** Names of mocks that end up exported as classes from a `jest.mock` factory: `{ Foo: fooMock }`. */
const collectConstructorMockNames = (sourceFile, names) => {
  for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const factory = call.getArguments()[1];
    if (!isMockCall(call) || !factory || !FUNCTION_KINDS.has(factory.getKind())) {
      continue;
    }
    for (const property of factory.getDescendants()) {
      if (Node.isShorthandPropertyAssignment(property) && isClassLikeName(property.getName())) {
        names.add(property.getName());
      }
      if (Node.isPropertyAssignment(property) && isClassLikeName(property.getName())) {
        const initializer = property.getInitializer();
        if (Node.isIdentifier(initializer)) {
          names.add(initializer.getText());
        }
      }
    }
  }
  for (const expression of sourceFile.getDescendantsOfKind(SyntaxKind.NewExpression)) {
    if (Node.isIdentifier(expression.getExpression())) {
      names.add(expression.getExpression().getText());
    }
  }
};

const unwrap = (node) => {
  let current = node;
  while (
    Node.isParenthesizedExpression(current) ||
    Node.isAsExpression(current) ||
    Node.isNonNullExpression(current) ||
    Node.isTypeAssertion(current)
  ) {
    current = current.getExpression();
  }
  return current;
};

/** Whether `node` evaluates to a mock that gets called with `new`. */
const isConstructorMock = (node, constructorNames) => {
  const target = unwrap(node);
  if (Node.isIdentifier(target)) {
    return constructorNames.has(target.getText()) || isClassLikeName(target.getText());
  }
  if (Node.isPropertyAccessExpression(target)) {
    return constructorNames.has(target.getName()) || isClassLikeName(target.getName());
  }
  if (Node.isCallExpression(target)) {
    const callee = target.getExpression().getText();
    const [first, second] = target.getArguments();
    if (callee === 'vi.mocked' && first) {
      return isConstructorMock(first, constructorNames);
    }
    if (callee === 'vi.spyOn' && second && Node.isStringLiteral(second)) {
      return isClassLikeName(second.getLiteralValue());
    }
  }
  return false;
};

/** Mock-defining calls of a chain such as `vi.fn(impl).mockImplementation(impl2)`. */
const viFnChain = (expression) => {
  const calls = [];
  let current = unwrap(expression);
  while (Node.isCallExpression(current)) {
    const callee = current.getExpression();
    calls.push(current);
    if (callee.getText() === 'vi.fn') {
      return calls;
    }
    if (!Node.isPropertyAccessExpression(callee)) {
      return undefined;
    }
    current = callee.getExpression();
  }
  return undefined;
};

const THIS_BINDING_KINDS = new Set([
  ...FUNCTION_KINDS,
  SyntaxKind.Constructor,
  SyntaxKind.GetAccessor,
  SyntaxKind.SetAccessor,
]);

const usesLexicalThis = (arrow) =>
  arrow.getDescendantsOfKind(SyntaxKind.ThisKeyword).some((keyword) => {
    const owner = keyword.getFirstAncestor(
      (ancestor) => THIS_BINDING_KINDS.has(ancestor.getKind()) && !Node.isArrowFunction(ancestor)
    );
    return owner === undefined || owner.getStart() < arrow.getStart();
  });

/** `() => value` -> `function () { return value; }`: arrows can't be called with `new`. */
const toFunctionImplementation = (arrow, reporter) => {
  if (!Node.isArrowFunction(arrow)) {
    return;
  }
  if (usesLexicalThis(arrow)) {
    reporter.manual(
      arrow,
      'constructor mock implementation is an arrow that uses `this`; rewrite it as a `function`'
    );
    return;
  }
  const asyncPrefix = arrow.isAsync() ? 'async ' : '';
  const typeParameters = arrow.getTypeParameters().map((param) => param.getText());
  const typeParams = typeParameters.length ? `<${typeParameters.join(', ')}>` : '';
  const params = arrow
    .getParameters()
    .map((param) => param.getText())
    .join(', ');
  const returnType = arrow.getReturnTypeNode();
  const returnTypeText = returnType ? `: ${returnType.getText()}` : '';
  const body = arrow.getBody();
  let bodyText;
  if (Node.isBlock(body)) {
    bodyText = body.getText();
  } else {
    const value = Node.isParenthesizedExpression(body) ? body.getExpression() : body;
    bodyText = `{\nreturn ${value.getText()};\n}`;
  }
  arrow.replaceWithText(
    `${asyncPrefix}function ${typeParams}(${params})${returnTypeText} ${bodyText}`
  );
};

const rewriteConstructorMocks = (sourceFile, constructorNames, reporter) => {
  const localNames = new Set(constructorNames);
  collectConstructorMockNames(sourceFile, localNames);

  const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).reverse();
  for (const call of calls) {
    if (call.wasForgotten()) {
      continue;
    }
    const callee = call.getExpression();
    const [implementation] = call.getArguments();

    // X.mockImplementation(() => ...), vi.mocked(X).mockImplementation(...), vi.spyOn(global, 'Date')...
    if (Node.isPropertyAccessExpression(callee)) {
      const method = callee.getName();
      if (
        (IMPLEMENTATION_METHODS.has(method) || RETURN_VALUE_METHODS.has(method)) &&
        isConstructorMock(callee.getExpression(), localNames)
      ) {
        if (RETURN_VALUE_METHODS.has(method)) {
          reporter.manual(
            call,
            `${method}() on a constructor mock fails with \`new\` in Vitest; use mockImplementation(function () { return value; })`
          );
        } else if (implementation) {
          toFunctionImplementation(implementation, reporter);
        }
        continue;
      }
    }

    // const FooMock = vi.fn(() => ...); { Foo: vi.fn(() => ...) }
    if (callee.getText() !== 'vi.fn') {
      continue;
    }
    let outer = call;
    while (
      Node.isPropertyAccessExpression(outer.getParent()) &&
      Node.isCallExpression(outer.getParent().getParent())
    ) {
      outer = outer.getParent().getParent();
    }
    const holder = outer.getParent();
    const name =
      Node.isVariableDeclaration(holder) || Node.isPropertyAssignment(holder)
        ? holder.getName()
        : undefined;
    if (!name || !(localNames.has(name) || isClassLikeName(name))) {
      continue;
    }
    for (const chained of viFnChain(outer) ?? []) {
      if (chained.wasForgotten()) {
        continue;
      }
      const chainedCallee = chained.getExpression();
      const isImplementation =
        chainedCallee.getText() === 'vi.fn' ||
        (Node.isPropertyAccessExpression(chainedCallee) &&
          IMPLEMENTATION_METHODS.has(chainedCallee.getName()));
      if (isImplementation && chained.getArguments()[0]) {
        toFunctionImplementation(chained.getArguments()[0], reporter);
      }
    }
  }
};

const rewriteTypeReferences = (sourceFile, vitestTypes, reporter) => {
  for (const ref of sourceFile.getDescendantsOfKind(SyntaxKind.QualifiedName).reverse()) {
    if (ref.wasForgotten() || ref.getLeft().getText() !== 'jest') {
      continue;
    }
    const name = ref.getRight().getText();
    if (Node.isTypeQuery(ref.getParent())) {
      // typeof jest.fn
      ref.replaceWithText(`vi.${name}`);
      continue;
    }
    const renamed = TYPE_RENAMES[name];
    if (!renamed) {
      reporter.manual(ref, `no Vitest mapping for type jest.${name}`);
      continue;
    }
    vitestTypes.add(renamed);
    const typeRef = ref.getParentIfKind(SyntaxKind.TypeReference);
    const typeArgs = typeRef ? typeRef.getTypeArguments() : [];
    if (RETURN_TYPE_GENERICS.has(name) && typeArgs.length) {
      const [returnType, args] = typeArgs;
      const isFunctionType =
        !args && (Node.isTypeQuery(returnType) || Node.isFunctionTypeNode(returnType));
      if (!isFunctionType) {
        const params = args ? `...args: ${args.getText()}` : '...args: any[]';
        typeRef.replaceWithText(`${renamed}<(${params}) => ${returnType.getText()}>`);
        continue;
      }
    }
    ref.replaceWithText(renamed);
  }

  for (const namespace of sourceFile.getDescendantsOfKind(SyntaxKind.ModuleDeclaration)) {
    if (namespace.getName() === 'jest') {
      reporter.manual(
        namespace,
        'augments the `jest` namespace (custom matchers?); augment `vitest` Assertion instead'
      );
    }
  }
};

const rewriteJestCalls = (sourceFile, reporter) => {
  const accesses = sourceFile
    .getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
    .filter((access) => access.getExpression().getText() === 'jest')
    .reverse();

  for (const access of accesses) {
    if (access.wasForgotten()) {
      continue;
    }
    const api = access.getName();
    const call = access.getParentIfKind(SyntaxKind.CallExpression);
    const callArgs = call && call.getExpression() === access ? call.getArguments() : [];

    if (api === 'isolateModules' && call && rewriteIsolatedRequire(call, reporter)) {
      continue;
    }

    if (UNSUPPORTED_APIS.has(api)) {
      reporter.manual(access, `jest.${api} has no Vitest equivalent`);
      continue;
    }

    if (HOISTED_APIS.has(api) && call && !Node.isSourceFile(call.getParent()?.getParent())) {
      // Jest hoists these only within their block, i.e. they affect later requires. Vitest 5
      // throws for nested vi.mock(); vi.doMock() has the block-local semantics.
      access.getNameNode().replaceWithText(api === 'mock' ? 'doMock' : 'doUnmock');
      reporter.review(access, `nested jest.${api} converted to vi.do*; check import order`);
    }

    if (api === 'mock' && callArgs[2]) {
      reporter.manual(access, 'jest.mock() options (virtual mocks) are not supported by Vitest');
    }

    if (api === 'useFakeTimers' && callArgs[0]) {
      const options = callArgs[0].getText();
      if (/legacy|doNotFake/.test(options) || Node.isStringLiteral(callArgs[0])) {
        reporter.manual(access, `vi.useFakeTimers() options differ from Jest's: ${options}`);
      }
    }

    if ((api === 'requireActual' || api === 'requireMock') && call) {
      const typeArgs = call.getTypeArguments().map((arg) => arg.getText());
      const typeArgText = typeArgs.length ? `<${typeArgs.join(', ')}>` : '';
      const args = callArgs.map((arg) => arg.getText()).join(', ');
      const target = api === 'requireActual' ? 'importActual' : 'importMock';
      makeEnclosingFunctionAsync(call, reporter);
      call.replaceWithText(awaited(call, `vi.${target}${typeArgText}(${args})`));
      continue;
    }

    if (api === 'setTimeout' && call) {
      call.replaceWithText(`vi.setConfig({ testTimeout: ${callArgs[0].getText()} })`);
      continue;
    }

    access.getExpression().replaceWithText('vi');
  }

  for (const identifier of sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)) {
    if (identifier.getText() !== 'jest') {
      continue;
    }
    const parent = identifier.getParent();
    // jest.<api> and jest.<Type> are reported above
    const isHandled =
      Node.isPropertyAccessExpression(parent) ||
      Node.isQualifiedName(parent) ||
      Node.isModuleDeclaration(parent);
    const isImportName =
      Node.isImportSpecifier(parent) ||
      Node.isImportClause(parent) ||
      Node.isNamespaceImport(parent);
    if (!isHandled && !isImportName) {
      reporter.manual(identifier, 'leftover reference to the `jest` global');
    }
  }
};

/**
 * `require()` loads modules natively: it bypasses vi.mock() and can't load TypeScript. Load the
 * module through Vitest with `await import()` in mock factories and for Kibana sources.
 */
const rewriteRequires = (sourceFile, reporter) => {
  const calls = sourceFile
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter((call) => {
      const [specifier] = call.getArguments();
      return (
        call.getExpression().getText() === 'require' &&
        specifier !== undefined &&
        Node.isStringLiteral(specifier)
      );
    })
    .reverse();
  for (const call of calls) {
    if (call.wasForgotten()) {
      continue;
    }
    const specifier = call.getArguments()[0];
    const fn = enclosingFunction(call);
    const inFactory = fn !== undefined && isMockFactory(fn);
    const inIsolateModules =
      fn !== undefined && /^jest\.isolateModules/.test(fn.getParent().getText());
    if (inIsolateModules || (!inFactory && isBarePackageSpecifier(specifier.getLiteralValue()))) {
      continue;
    }
    if (!inFactory) {
      reporter.review(call, `require(${specifier.getText()}) converted to await import()`);
    }
    makeEnclosingFunctionAsync(call, reporter);
    call.replaceWithText(awaited(call, `import(${specifier.getText()})`));
  }
};

const ESM_INTEROP_KEYS = new Set(['default', '__esModule']);

/** The object literal a mock factory returns, if it returns one directly. */
const returnedObjectLiteral = (node) => {
  const expression = node && unwrap(node);
  return Node.isObjectLiteralExpression(expression) ? expression : undefined;
};

/**
 * Jest's CommonJS interop makes `import fs from 'fs'` return the whole factory object when it
 * has no `default`/`__esModule` key; Vitest throws (or keeps the real `default` spread in from the
 * actual module). Expose the object as `default` too.
 */
const addDefaultToMockFactories = (sourceFile) => {
  const factories = sourceFile
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter((call) => isMockCall(call, /^vi\.(mock|doMock)$/))
    .map((call) => call.getArguments()[1])
    .filter((factory) => Node.isArrowFunction(factory) || Node.isFunctionExpression(factory))
    .reverse();
  for (const factory of factories) {
    if (factory.wasForgotten()) {
      continue;
    }
    const body = factory.getBody();
    const returns = Node.isBlock(body)
      ? body.getStatements().filter(Node.isReturnStatement)
      : [body];
    const literals = returns.map((statement) =>
      returnedObjectLiteral(
        Node.isReturnStatement(statement) ? statement.getExpression() : statement
      )
    );
    const hasInteropKey = (literal) =>
      literal
        .getProperties()
        .some(
          (property) =>
            !Node.isSpreadAssignment(property) &&
            ESM_INTEROP_KEYS.has(property.getName().replace(/['"]/g, ''))
        );
    if (!literals.length || literals.some((literal) => !literal || hasInteropKey(literal))) {
      continue;
    }

    let name = 'mockedModule';
    for (let i = 2; factory.getText().includes(name); i++) {
      name = `mockedModule${i}`;
    }
    const exposeDefault = (literal) =>
      `const ${name} = ${literal.getText()};\nreturn { ...${name}, default: ${name} };`;

    if (!Node.isBlock(body)) {
      const asyncPrefix = factory.isAsync() ? 'async ' : '';
      const params = factory
        .getParameters()
        .map((param) => param.getText())
        .join(', ');
      factory.replaceWithText(`${asyncPrefix}(${params}) => {\n${exposeDefault(literals[0])}\n}`);
      continue;
    }
    const start = body.getStart();
    let text = body.getText();
    returns.forEach((statement, i) => {
      const from = statement.getStart() - start;
      const to = statement.getEnd() - start;
      text = `${text.slice(0, from)}${exposeDefault(literals[i])}${text.slice(to)}`;
    });
    body.replaceWithText(text);
  }
};

/**
 * `jest.isolateModules(() => { mod = require('./mod'); })` -> `vi.resetModules(); mod = await
 * import('./mod');`. Returns false for any other callback, which is then reported.
 */
const rewriteIsolatedRequire = (call, reporter) => {
  const [callback] = call.getArguments();
  const statement = call.getParentIfKind(SyntaxKind.ExpressionStatement);
  if (
    !statement ||
    !(Node.isArrowFunction(callback) || Node.isFunctionExpression(callback)) ||
    callback.getParameters().length ||
    callback.isAsync()
  ) {
    return false;
  }
  const body = callback.getBody();
  const statements = Node.isBlock(body) ? body.getStatements() : [body];
  const [only] = statements;
  const expression = unwrap(Node.isExpressionStatement(only) ? only.getExpression() : only);
  if (
    statements.length !== 1 ||
    !Node.isBinaryExpression(expression) ||
    expression.getOperatorToken().getKind() !== SyntaxKind.EqualsToken
  ) {
    return false;
  }
  // require('./mod') or require('./mod').member
  const value = unwrap(expression.getRight());
  const member = Node.isPropertyAccessExpression(value) ? value.getName() : undefined;
  const requireCall = member ? value.getExpression() : value;
  const [specifier] = Node.isCallExpression(requireCall) ? requireCall.getArguments() : [];
  if (
    !Node.isCallExpression(requireCall) ||
    requireCall.getExpression().getText() !== 'require' ||
    requireCall.getArguments().length !== 1 ||
    !Node.isStringLiteral(specifier)
  ) {
    return false;
  }
  const imported = `await import(${specifier.getText()})`;
  const assigned = member ? `(${imported}).${member}` : imported;
  makeEnclosingFunctionAsync(call, reporter);
  reporter.review(statement, 'jest.isolateModules() converted to vi.resetModules() + import()');
  statement.replaceWithText(`vi.resetModules();\n${expression.getLeft().getText()} = ${assigned};`);
  return true;
};

/**
 * Exported `vi.fn()` values get an explicit `Mock` type: their inferred type refers to
 * @vitest/spy, which the declaration emit can't name.
 */
const annotateExportedMocks = (sourceFile, vitestTypes) => {
  const annotateProperties = (literal) => {
    for (const property of literal.getProperties()) {
      if (!Node.isPropertyAssignment(property)) {
        continue;
      }
      const initializer = property.getInitializer();
      if (Node.isObjectLiteralExpression(initializer)) {
        annotateProperties(initializer);
      } else if (viFnChain(initializer)) {
        vitestTypes.add('Mock');
        initializer.replaceWithText(`${initializer.getText()} as Mock`);
      }
    }
  };
  for (const statement of sourceFile.getVariableStatements()) {
    if (!statement.isExported()) {
      continue;
    }
    for (const declaration of statement.getDeclarations()) {
      const initializer = declaration.getInitializer();
      if (declaration.getTypeNode() || !initializer) {
        continue;
      }
      if (viFnChain(initializer)) {
        vitestTypes.add('Mock');
        declaration.setType('Mock');
      } else if (Node.isObjectLiteralExpression(initializer)) {
        annotateProperties(initializer);
      }
    }
  }
};

/**
 * `beforeEach(() => fn.mockReset())` returns the mock function; Vitest runs a function returned
 * from a hook as its teardown, i.e. calls the mock after the test. Use a block body instead.
 */
const blockBodyForMockReturningHooks = (sourceFile) => {
  const arrows = sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction).reverse();
  for (const arrow of arrows) {
    if (arrow.wasForgotten()) {
      continue;
    }
    const call = arrow.getParentIfKind(SyntaxKind.CallExpression);
    const body = arrow.getBody();
    if (!call || !HOOKS.has(call.getExpression().getText()) || !Node.isCallExpression(body)) {
      continue;
    }
    const callee = body.getExpression();
    const returnsMock =
      Node.isPropertyAccessExpression(callee) &&
      (/^mock/.test(callee.getName()) || /^vi\.(fn|spyOn)$/.test(callee.getText()));
    if (returnsMock) {
      body.replaceWithText(`{\n${body.getText()};\n}`);
    }
  }
};

// Jest silently ignores un-awaited `expect(p).rejects/resolves`; Vitest fails the test.
const awaitAsyncAssertions = (sourceFile, reporter) => {
  const statements = sourceFile.getDescendantsOfKind(SyntaxKind.ExpressionStatement).reverse();
  for (const statement of statements) {
    if (statement.wasForgotten()) {
      continue;
    }
    const expression = statement.getExpression();
    if (
      !Node.isCallExpression(expression) ||
      !/^expect\([\s\S]*\)\s*\.(not\s*\.)?(rejects|resolves)\s*\./.test(expression.getText())
    ) {
      continue;
    }
    const fn = enclosingFunction(statement);
    if (fn && !fn.isAsync()) {
      reporter.manual(statement, 'un-awaited async assertion in a sync function');
      continue;
    }
    reporter.review(statement, 'awaited a dangling async assertion');
    statement.replaceWithText(`await ${statement.getText()}`);
  }
};

/** Vitest has no done callback: wrap the body in a Promise and expose `done` from it. */
const promisifyDoneCallbacks = (sourceFile, reporter) => {
  const testCallbacks = sourceFile
    .getDescendants()
    .filter((node) => FUNCTION_KINDS.has(node.getKind()) && isTestCallback(node))
    .reverse();
  for (const fn of testCallbacks) {
    if (fn.wasForgotten()) {
      continue;
    }
    const call = fn.getParent();
    const callee = call.getExpression().getText();
    const params = fn.getParameters();
    if (params.length !== 1 || /\.each\(|^describe/.test(callee) || fn.isAsync()) {
      continue;
    }
    const doneName = params[0].getName();
    const body = fn.getBody();
    const bodyText = Node.isBlock(body) ? body.getText().slice(1, -1) : `${body.getText()};`;
    const isTs = /\.tsx?$/.test(sourceFile.getFilePath());
    const errorParam = isTs ? 'error?: unknown' : 'error';
    const promise = isTs ? 'new Promise<void>' : 'new Promise';
    reporter.review(fn, `converted ${doneName}() callback to a Promise`);
    fn.replaceWithText(
      `() =>\n${promise}((resolve, reject) => {\nconst ${doneName} = Object.assign((${errorParam}) => (error ? reject(error) : resolve()), { fail: reject });\n${bodyText}\n})`
    );
  }
};

/** Jest's `%p` (pretty-format) placeholder doesn't exist in Vitest; `%o` is the closest. */
const rewriteEachTitles = (sourceFile, reporter) => {
  const hasSnapshots = /toMatch(Inline)?Snapshot/.test(sourceFile.getFullText());
  for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const callee = call.getExpression();
    const [title] = call.getArguments();
    if (
      !Node.isCallExpression(callee) ||
      !/^(it|test|describe)(\.\w+)*\.each$/.test(callee.getExpression().getText()) ||
      !title ||
      !(Node.isStringLiteral(title) || Node.isNoSubstitutionTemplateLiteral(title)) ||
      !title.getLiteralValue().includes('%p')
    ) {
      continue;
    }
    title.setLiteralValue(title.getLiteralValue().replace(/%p/g, '%o'));
    if (hasSnapshots) {
      reporter.manual(title, '`%p` title changed to `%o`; snapshot keys of this block change too');
    }
  }
};

const reportAndRenameModules = (sourceFile, reporter) => {
  for (const declaration of [
    ...sourceFile.getImportDeclarations(),
    ...sourceFile.getExportDeclarations(),
  ]) {
    const specifier = declaration.getModuleSpecifierValue();
    if (!specifier) {
      continue;
    }
    if (MODULE_RENAMES[specifier]) {
      declaration.setModuleSpecifier(MODULE_RENAMES[specifier]);
    } else if (JEST_ONLY_MODULE.test(specifier)) {
      reporter.manual(declaration, `imports Jest-only module '${specifier}'`);
    }
  }
};

const reportUntranslatable = (sourceFile, reporter) => {
  for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const callee = call.getExpression();
    if (
      Node.isPropertyAccessExpression(callee) &&
      callee.getName() === 'toThrowErrorMatchingInlineSnapshot' &&
      call.getArguments().length
    ) {
      reporter.manual(
        call,
        'inline error snapshot: Vitest prints `[Error: message]`; regenerate with `node scripts/vitest <file> -u`'
      );
    }
    if (Node.isIdentifier(callee) && callee.getText() === 'fail') {
      reporter.manual(
        call,
        'the `fail()` global does not exist in Vitest; throw or use expect.fail()'
      );
    }
  }
};

/**
 * Adds the 'vitest' types used by the rewrite. JS files also import `vi`: TS files get the global
 * from `vitest/globals` types, but lint has no such declaration for JS.
 */
const addVitestImports = (sourceFile, vitestTypes) => {
  const vitestImports = sourceFile
    .getImportDeclarations()
    .filter((declaration) => declaration.getModuleSpecifierValue() === 'vitest');
  const importsVi = vitestImports.some(
    (declaration) =>
      !declaration.isTypeOnly() &&
      declaration.getNamedImports().some((named) => named.getName() === 'vi')
  );
  const needsVi =
    /\.[cm]?jsx?$/.test(sourceFile.getFilePath()) &&
    !importsVi &&
    sourceFile
      .getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
      .some((access) => access.getExpression().getText() === 'vi');

  const lines = [];
  if (needsVi) {
    lines.push(`import { vi } from 'vitest';`);
  }
  const typeImport = vitestImports.find((declaration) => declaration.isTypeOnly());
  if (typeImport && vitestTypes.size) {
    const present = new Set(typeImport.getNamedImports().map((named) => named.getName()));
    typeImport.addNamedImports([...vitestTypes].filter((name) => !present.has(name)).sort());
  } else if (vitestTypes.size) {
    lines.push(`import type { ${[...vitestTypes].sort().join(', ')} } from 'vitest';`);
  }
  if (!lines.length) {
    return;
  }
  const text = `${lines.join('\n')}\n`;
  const [firstStatement] = sourceFile.getStatements();
  if (!firstStatement) {
    sourceFile.addStatements(text);
    return;
  }
  // stay below the license header, but above an eslint-disable-next-line meant for the statement
  const directive = firstStatement
    .getLeadingCommentRanges()
    .find((comment) => /eslint-disable-next-line/.test(comment.getText()));
  sourceFile.insertText(directive ? directive.getPos() : firstStatement.getStart(), text);
};

const transformSourceFile = (sourceFile, constructorNames) => {
  const reporter = createReporter(sourceFile);
  const vitestTypes = new Set();

  rewriteTypeReferences(sourceFile, vitestTypes, reporter);
  rewriteJestCalls(sourceFile, reporter);
  rewriteRequires(sourceFile, reporter);
  rewriteConstructorMocks(sourceFile, constructorNames, reporter);
  addDefaultToMockFactories(sourceFile);
  annotateExportedMocks(sourceFile, vitestTypes);
  blockBodyForMockReturningHooks(sourceFile);
  awaitAsyncAssertions(sourceFile, reporter);
  promisifyDoneCallbacks(sourceFile, reporter);
  rewriteEachTitles(sourceFile, reporter);
  reportAndRenameModules(sourceFile, reporter);
  reportUntranslatable(sourceFile, reporter);
  addVitestImports(sourceFile, vitestTypes);

  return reporter.entries;
};

// `require()` became `await import()`; its lint suppression is obsolete.
const dropObsoleteRequireDirectives = (text) =>
  text.replace(
    /^[ \t]*\/\/ eslint-disable-next-line [\w@/-]*(no-var-requires|no-require-imports)[ \t]*\n(?=[^\n]*await import\()/gm,
    ''
  );

const format = (path, text) => {
  const config = Prettier.resolveConfig.sync(path) ?? {};
  return Prettier.format(text, { ...config, filepath: path });
};

/**
 * Rewrites the given files in place (unless `dryRun`) and returns what needs a manual look.
 * Files are processed together so constructor mocks exported by one file are recognized where
 * another file configures them.
 *
 * @param {string[]} files absolute paths
 * @param {{ dryRun?: boolean }} [options]
 * @returns {{ file: string, line: number, kind: 'manual' | 'review', message: string }[]}
 */
const transformFiles = (files, { dryRun = false } = {}) => {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
  });
  const sourceFiles = files.map((file) => project.addSourceFileAtPath(file));
  const constructorNames = new Set();
  for (const sourceFile of sourceFiles) {
    collectConstructorMockNames(sourceFile, constructorNames);
  }

  const report = [];
  for (const sourceFile of sourceFiles) {
    const path = sourceFile.getFilePath();
    const before = sourceFile.getFullText();
    report.push(...transformSourceFile(sourceFile, constructorNames));
    const after = sourceFile.getFullText();
    if (after !== before && !dryRun) {
      Fs.writeFileSync(path, format(path, dropObsoleteRequireDirectives(after)));
    }
  }
  return report;
};

module.exports = { transformFiles };
