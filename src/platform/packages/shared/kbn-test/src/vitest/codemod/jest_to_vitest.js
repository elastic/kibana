/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Rewrites Jest test files to Vitest APIs:
 *
 *  - jest.<api>(...)             -> vi.<api>(...)
 *  - jest.requireActual('pkg')   -> require('pkg') for npm packages (Node's require is never mocked)
 *  - jest.requireActual(x)       -> (await vi.importActual(x)), enclosing function made async
 *  - jest.requireMock(x)         -> (await vi.importMock(x)), enclosing function made async
 *  - nested jest.mock()          -> vi.doMock() (Vitest 5 throws for nested vi.mock())
 *  - vi.mock(p, () => ({...}))   -> also exposes the object as `default`, like Jest's interop
 *  - (done) => {...} tests       -> Promise-returning tests
 *  - un-awaited expect().rejects -> awaited
 *  - jest.Mocked<T> & co.        -> Mocked<T> & co. imported from 'vitest'
 *  - adds `import { vi } from 'vitest'`
 *
 * Constructs without a mechanical translation are reported, not rewritten.
 *
 * Usage: node src/platform/packages/shared/kbn-test/src/vitest/codemod/jest_to_vitest.js [--dry-run] [--files-from=list.txt] <file...>
 */

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
  SpiedGetter: 'MockInstance',
  SpiedSetter: 'MockInstance',
  SnapshotSerializerPlugin: 'SnapshotSerializer',
};
// Specifiers the Kibana resolver remaps (e.g. EUI -> test-env build); their actual module must
// go through Vitest's resolver, never Node's require.
const RESOLVER_MAPPED_SPECIFIER = /^@elastic\/eui(\/|$)/;
const isBarePackageSpecifier = (specifier) =>
  !specifier.startsWith('.') &&
  !specifier.startsWith('/') &&
  !specifier.startsWith('@kbn/') &&
  !RESOLVER_MAPPED_SPECIFIER.test(specifier);
const UNSUPPORTED_APIS = new Set([
  'isolateModules',
  'isolateModulesAsync',
  'createMockFromModule',
  'genMockFromModule',
  'retryTimes',
  'enableAutomock',
  'disableAutomock',
]);
const HOISTED_APIS = new Set(['mock', 'unmock']);
const FUNCTION_KINDS = new Set([
  SyntaxKind.ArrowFunction,
  SyntaxKind.FunctionExpression,
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.MethodDeclaration,
]);

const location = (node) => `${node.getSourceFile().getFilePath()}:${node.getStartLineNumber()}`;

const isJestMockFactory = (fn) => {
  const call = fn.getParentIfKind(SyntaxKind.CallExpression);
  return (
    call !== undefined &&
    /^(jest|vi)\.(mock|doMock)$/.test(call.getExpression().getText()) &&
    call.getArguments()[1] === fn
  );
};

const isTestCallback = (fn) => {
  const call = fn.getParentIfKind(SyntaxKind.CallExpression);
  return (
    call !== undefined &&
    /^(it|test|beforeEach|beforeAll|afterEach|afterAll)(\.(only|skip|each\(.*\)))?$/s.test(
      call.getExpression().getText()
    )
  );
};

const makeEnclosingFunctionAsync = (node, report) => {
  const fn = node.getFirstAncestor((ancestor) => FUNCTION_KINDS.has(ancestor.getKind()));
  if (!fn) {
    // module top level: ESM allows top-level await
    return;
  }
  if (!fn.isAsync()) {
    fn.setIsAsync(true);
  }
  if (!isJestMockFactory(fn) && !isTestCallback(fn)) {
    report.push(`${location(node)} made a helper async; verify its callers await it`);
  }
};

// Jest silently ignores un-awaited `expect(p).rejects/resolves`; Vitest fails the test.
const awaitAsyncAssertions = (sourceFile, report) => {
  const statements = sourceFile.getDescendantsOfKind(SyntaxKind.ExpressionStatement).reverse();
  for (const statement of statements) {
    if (statement.wasForgotten()) {
      continue;
    }
    const expression = statement.getExpression();
    if (
      !Node.isCallExpression(expression) ||
      !/^expect\([\s\S]*\)\.(rejects|resolves)\./.test(expression.getText())
    ) {
      continue;
    }
    const fn = statement.getFirstAncestor((ancestor) => FUNCTION_KINDS.has(ancestor.getKind()));
    if (fn && !fn.isAsync()) {
      report.push(`${location(statement)} un-awaited async assertion in a sync function`);
      continue;
    }
    report.push(`${location(statement)} awaited a dangling async assertion`);
    statement.replaceWithText(`await ${statement.getText()}`);
  }
};

/**
 * Jest's CommonJS interop makes `import x from 'mocked'` return the whole factory object when it
 * has no `default`/`__esModule` key; Vitest throws instead. Expose the object as `default` too.
 */
const addDefaultToMockFactories = (sourceFile) => {
  const calls = sourceFile
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter((call) => /^vi\.(mock|doMock)$/.test(call.getExpression().getText()));
  for (const call of calls) {
    const factory = call.getArguments()[1];
    if (!factory || !Node.isArrowFunction(factory) || factory.getParameters().length) {
      continue;
    }
    const body = factory.getBody();
    const literal = Node.isParenthesizedExpression(body) ? body.getExpression() : undefined;
    if (!literal || !Node.isObjectLiteralExpression(literal)) {
      continue;
    }
    const hasEsModuleShape = literal
      .getProperties()
      .some(
        (property) =>
          (Node.isPropertyAssignment(property) ||
            Node.isShorthandPropertyAssignment(property) ||
            Node.isMethodDeclaration(property)) &&
          ['default', '__esModule'].includes(property.getName().replace(/['"]/g, ''))
      );
    if (hasEsModuleShape) {
      continue;
    }
    const asyncPrefix = factory.isAsync() ? 'async ' : '';
    factory.replaceWithText(
      `${asyncPrefix}() => {\n  const mocked = ${literal.getText()};\n  return { ...mocked, default: mocked };\n}`
    );
  }
};

/**
 * `require('./module')` / `require('@kbn/pkg')` of Kibana sources: Node's require cannot load
 * TypeScript and bypasses vi.mock(), so load them through Vitest with `await import()`.
 * Returns the namespace like require() of an ES module did under Jest.
 */
const requireSourcesAsImports = (sourceFile, report) => {
  const calls = sourceFile
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter((call) => {
      const [specifier] = call.getArguments();
      return (
        call.getExpression().getText() === 'require' &&
        specifier !== undefined &&
        Node.isStringLiteral(specifier) &&
        !isBarePackageSpecifier(specifier.getLiteralValue())
      );
    })
    .reverse();
  for (const call of calls) {
    if (call.wasForgotten()) {
      continue;
    }
    const specifier = call.getArguments()[0].getText();
    makeEnclosingFunctionAsync(call, report);
    call.replaceWithText(`(await import(${specifier}))`);
  }
};

const transformFile = (sourceFile) => {
  const report = [];
  const vitestTypes = new Set();
  let usesVi = false;

  // Type references: jest.Mocked<T> -> Mocked<T>; `typeof jest.fn` -> `typeof vi.fn`
  for (const ref of sourceFile.getDescendantsOfKind(SyntaxKind.QualifiedName).reverse()) {
    if (ref.wasForgotten() || ref.getLeft().getText() !== 'jest') {
      continue;
    }
    const name = ref.getRight().getText();
    if (Node.isTypeQuery(ref.getParent())) {
      usesVi = true;
      ref.replaceWithText(`vi.${name}`);
      continue;
    }
    const renamed = TYPE_RENAMES[name];
    if (!renamed) {
      report.push(`${location(ref)} unmapped type jest.${name}`);
      continue;
    }
    vitestTypes.add(renamed);
    ref.replaceWithText(renamed);
  }

  // Runtime calls, innermost first so replacements do not invalidate parents.
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
    usesVi = true;

    if (UNSUPPORTED_APIS.has(api)) {
      report.push(`${location(access)} jest.${api} has no Vitest equivalent`);
      continue;
    }

    const isNestedHoistedCall =
      HOISTED_APIS.has(api) && call && !Node.isSourceFile(call.getParent()?.getParent());
    if (isNestedHoistedCall) {
      // Jest hoists these only within their block, i.e. they affect later requires. Vitest 5
      // throws for nested vi.mock(); vi.doMock() has the block-local semantics.
      access.getNameNode().replaceWithText(api === 'mock' ? 'doMock' : 'doUnmock');
      report.push(`${location(access)} nested jest.${api} converted to vi.do*; check import order`);
    }

    if ((api === 'requireActual' || api === 'requireMock') && call) {
      const typeArgs = call.getTypeArguments().map((arg) => arg.getText());
      const args = call
        .getArguments()
        .map((arg) => arg.getText())
        .join(', ');
      const [specifierArg] = call.getArguments();
      const specifier = Node.isStringLiteral(specifierArg) ? specifierArg.getLiteralValue() : '';
      if (api === 'requireActual' && isBarePackageSpecifier(specifier)) {
        // npm packages load natively in Vitest and vi.mock() never intercepts Node's require,
        // so require() returns the actual module synchronously, CommonJS exports included.
        call.replaceWithText(
          typeArgs.length ? `(require(${args}) as ${typeArgs[0]})` : `require(${args})`
        );
        continue;
      }
      const typeArgText = typeArgs.length ? `<${typeArgs.join(', ')}>` : '';
      const target = api === 'requireActual' ? 'importActual' : 'importMock';
      makeEnclosingFunctionAsync(call, report);
      call.replaceWithText(`(await vi.${target}${typeArgText}(${args}))`);
      continue;
    }

    if (api === 'setTimeout' && call) {
      call.replaceWithText(`vi.setConfig({ testTimeout: ${call.getArguments()[0].getText()} })`);
      continue;
    }

    access.getExpression().replaceWithText('vi');
  }

  addDefaultToMockFactories(sourceFile);
  requireSourcesAsImports(sourceFile, report);
  awaitAsyncAssertions(sourceFile, report);

  const testCallbacks = sourceFile
    .getDescendants()
    .filter((node) => FUNCTION_KINDS.has(node.getKind()) && isTestCallback(node))
    .reverse();
  for (const fn of testCallbacks) {
    if (fn.wasForgotten()) {
      continue;
    }
    const params = fn.getParameters();
    const isEach = /\.each\(/.test(fn.getParent().getExpression().getText());
    if (params.length !== 1 || isEach || fn.isAsync()) {
      continue;
    }
    // Vitest has no done callback: wrap the body in a Promise and expose `done` from it.
    const doneName = params[0].getName();
    const body = fn.getBody();
    const bodyText = Node.isBlock(body) ? body.getText().slice(1, -1) : `${body.getText()};`;
    const isTs = /\.tsx?$/.test(sourceFile.getFilePath());
    const errorParam = isTs ? 'error?: unknown' : 'error';
    const promise = isTs ? 'new Promise<void>' : 'new Promise';
    report.push(`${location(fn)} converted ${doneName}() callback to a Promise`);
    fn.replaceWithText(
      `() =>\n${promise}((resolve, reject) => {\nconst ${doneName} = Object.assign((${errorParam}) => (error ? reject(error) : resolve()), { fail: reject });\n${bodyText}\n})`
    );
  }

  const importLines = [];
  if (usesVi) {
    importLines.push(`import { vi } from 'vitest';`);
  }
  if (vitestTypes.size) {
    importLines.push(`import type { ${[...vitestTypes].sort().join(', ')} } from 'vitest';`);
  }
  if (importLines.length) {
    // keep the license header and file-level eslint directives first
    const [firstStatement] = sourceFile.getStatements();
    const [headerComment, ...otherComments] = firstStatement
      ? firstStatement.getLeadingCommentRanges()
      : [];
    const directives = otherComments.filter((comment) => /eslint-disable/.test(comment.getText()));
    const anchor = directives.at(-1) ?? headerComment;
    const text = importLines.join('\n');
    if (anchor) {
      sourceFile.insertText(anchor.getEnd(), `\n\n${text}`);
    } else {
      sourceFile.insertText(0, `${text}\n\n`);
    }
  }

  return report;
};

const BATCH_SIZE = 500;

const run = (files, { dryRun = false } = {}) => {
  const report = [];
  // A fresh project per batch keeps memory bounded on repo-wide runs.
  for (let start = 0; start < files.length; start += BATCH_SIZE) {
    const project = new Project({
      skipAddingFilesFromTsConfig: true,
      skipFileDependencyResolution: true,
    });
    for (const file of files.slice(start, start + BATCH_SIZE)) {
      report.push(...transformFile(project.addSourceFileAtPath(file)));
    }
    if (!dryRun) {
      project.saveSync();
    }
  }
  return report;
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const listArg = args.find((arg) => arg.startsWith('--files-from='));
  const files = [
    ...args.filter((arg) => !arg.startsWith('--')),
    ...(listArg
      ? require('fs')
          .readFileSync(listArg.slice('--files-from='.length), 'utf8')
          .split('\n')
          .filter(Boolean)
      : []),
  ];
  const report = run(files, { dryRun });
  for (const line of report) {
    process.stdout.write(`${line}\n`);
  }
  process.stdout.write(`${report.length} item(s) need manual review\n`);
}

module.exports = { run };
