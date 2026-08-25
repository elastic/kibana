/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Crypto = require('crypto');
const Fs = require('fs');
const Path = require('path');
const babelJest = require('babel-jest');
const MagicString = require('magic-string');
const remapping = require('@jridgewell/remapping');
const { parseSync } = require('@swc/core');
const { createTransformer } = require('@swc/jest');
const { getJestSwcConfig } = require('@kbn/swc-config/jest');
const { getNodeRegisterParserConfig } = require('@kbn/swc-config/node_register');
const babelTransformer = require('../babel');
const createBabelTransformerConfig = require('../babel/transformer_config');

const THIS_FILE = Fs.readFileSync(__filename);
const SWC_CORE_VERSION = require('@swc/core').version;
const SWC_JEST_VERSION = require('@swc/jest/package.json').version;
const EMOTION_PLUGIN_VERSION = require('@swc/plugin-emotion-jest/package.json').version;
const SOURCE_START = Symbol('sourceStart');
const babelEsmTransformer = babelJest.default.createTransformer(
  createBabelTransformerConfig({ modules: false })
);

const swcTransformers = new Map(
  ['.js', '.mjs', '.ts', '.tsx'].map((extension) => [
    extension,
    createTransformer(getJestSwcConfig(`/__kbn_jest_transformer__${extension}`)),
  ])
);

function getSwcTransformer(sourcePath) {
  return swcTransformers.get(Path.extname(sourcePath)) ?? swcTransformers.get('.js');
}

const REQUIRES_BABEL_JEST_HOIST =
  /\bjest\s*\.\s*(?:disableAutomock|enableAutomock|mock|unmock)\s*\(/;

function requiresBabelJestHoist(sourceText) {
  return REQUIRES_BABEL_JEST_HOIST.test(sourceText);
}

function visitAst(node, visitor) {
  if (!node || typeof node !== 'object') {
    return;
  }

  visitor(node);

  for (const [key, value] of Object.entries(node)) {
    if (key === 'span') {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => visitAst(item, visitor));
    } else {
      visitAst(value, visitor);
    }
  }
}

function visitAstWithAncestors(node, visitor, ancestors = []) {
  if (!node || typeof node !== 'object') {
    return;
  }

  visitor(node, ancestors);
  const nextAncestors = [...ancestors, node];

  for (const [key, value] of Object.entries(node)) {
    if (key === 'span') {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => visitAstWithAncestors(item, visitor, nextAncestors));
    } else {
      visitAstWithAncestors(value, visitor, nextAncestors);
    }
  }
}

function parseSource(sourceText, sourcePath) {
  const sentinelPrefix = '\n';
  const sentinelName = '__KBN_SOURCE_SPAN_SENTINEL__';
  const ast = parseSync(
    `${sourceText}${sentinelPrefix}const ${sentinelName} = 0;`,
    getNodeRegisterParserConfig(sourcePath)
  );
  const sentinelIndex = ast.body.findLastIndex(
    (item) =>
      item.type === 'VariableDeclaration' &&
      item.declarations[0]?.id.type === 'Identifier' &&
      item.declarations[0].id.value === sentinelName
  );
  const sentinel = ast.body[sentinelIndex];

  if (!sentinel) {
    throw new Error(`Unable to determine SWC source span offset for ${sourcePath}`);
  }

  ast.body.splice(sentinelIndex, 1);
  ast[SOURCE_START] =
    sentinel.span.start - Buffer.byteLength(sourceText) - Buffer.byteLength(sentinelPrefix);
  return ast;
}

function getIdentifierKey(identifier) {
  return `${identifier.ctxt}:${identifier.value}`;
}

function getStringLiteralValue(expression) {
  if (expression?.type === 'StringLiteral') {
    return expression.value;
  }

  if (expression?.type === 'TemplateLiteral' && expression.expressions.length === 0) {
    return expression.quasis[0]?.cooked ?? expression.quasis[0]?.raw;
  }
}

function replaceSourceSpans(sourceText, ast, replacements) {
  const sourceStart = ast[SOURCE_START];

  return replacements
    .sort((left, right) => right.span.start - left.span.start)
    .reduce((source, replacement) => {
      const start = replacement.span.start - sourceStart;
      const end = replacement.span.end - sourceStart;
      return Buffer.concat([
        source.subarray(0, start),
        Buffer.from(replacement.value),
        source.subarray(end),
      ]);
    }, Buffer.from(sourceText))
    .toString();
}

function getSourceSpanText(sourceText, ast, span) {
  const sourceStart = ast[SOURCE_START];
  return Buffer.from(sourceText)
    .subarray(span.start - sourceStart, span.end - sourceStart)
    .toString();
}

function getStringIndexForByteOffset(source, byteOffset) {
  return source.subarray(0, byteOffset).toString().length;
}

// Preserve the previous Babel/Jest contract: multiline JSX string attributes collapse newline
// indentation to one space. Kibana's i18n extraction and existing assertions rely on that value.
function normalizeMultilineJsxStringAttributes(sourceText, sourcePath) {
  if (!/=\s*["'][^"']*\r?\n/.test(sourceText)) {
    return { code: sourceText };
  }

  const ast = parseSource(sourceText, sourcePath);
  const source = Buffer.from(sourceText);
  const sourceStart = ast[SOURCE_START];
  const normalizedSource = new MagicString(sourceText);
  let changed = false;

  visitAst(ast, (node) => {
    if (node.type !== 'JSXAttribute' || node.value?.type !== 'StringLiteral') {
      return;
    }

    const normalizedValue = node.value.value.replace(/\r?\n[\t ]+/g, ' ');
    if (normalizedValue === node.value.value) {
      return;
    }

    const startByte = node.value.span.start - sourceStart;
    const endByte = node.value.span.end - sourceStart;
    normalizedSource.overwrite(
      getStringIndexForByteOffset(source, startByte),
      getStringIndexForByteOffset(source, endByte),
      `{${JSON.stringify(normalizedValue)}}`
    );
    changed = true;
  });

  if (!changed) {
    return { code: sourceText };
  }

  return {
    code: normalizedSource.toString(),
    map: JSON.parse(
      normalizedSource
        .generateMap({ hires: true, includeContent: true, source: sourcePath })
        .toString()
    ),
  };
}

function composeSourceMaps(result, inputMap) {
  if (!inputMap || !result?.map) {
    return result;
  }

  const outputMap = typeof result.map === 'string' ? JSON.parse(result.map) : result.map;
  return {
    ...result,
    map: JSON.stringify(remapping([outputMap, inputMap], () => null)),
  };
}

function unwrapExpression(expression) {
  if (
    expression?.type === 'TsAsExpression' ||
    expression?.type === 'TsConstAssertion' ||
    expression?.type === 'TsSatisfiesExpression' ||
    expression?.type === 'ParenthesisExpression'
  ) {
    return unwrapExpression(expression.expression);
  }

  return expression;
}

function getPropertyName(property) {
  if (property?.type === 'Identifier' || property?.type === 'StringLiteral') {
    return property.value;
  }

  if (property?.type === 'NumericLiteral') {
    return String(property.value);
  }
}

function inlineComputedEnumValues(sourceText, sourcePath) {
  if (!requiresComputedEnumTransform(sourceText, sourcePath)) {
    return sourceText;
  }

  const ast = parseSource(sourceText, sourcePath);
  const constantBindings = new Map();

  visitAst(ast, (node) => {
    if (node.type !== 'VariableDeclaration' || node.kind !== 'const') {
      return;
    }

    for (const declaration of node.declarations) {
      if (declaration.id.type === 'Identifier' && declaration.init) {
        constantBindings.set(getIdentifierKey(declaration.id), declaration.init);
      }
    }
  });

  const resolveConstant = (expression, seen = new Set()) => {
    const unwrapped = unwrapExpression(expression);

    if (unwrapped?.type === 'StringLiteral' || unwrapped?.type === 'NumericLiteral') {
      return unwrapped.value;
    }

    if (unwrapped?.type === 'TemplateLiteral') {
      let value = unwrapped.quasis[0]?.cooked ?? unwrapped.quasis[0]?.raw ?? '';

      for (const [index, expression] of unwrapped.expressions.entries()) {
        const expressionValue = resolveConstant(expression, seen);
        if (typeof expressionValue !== 'string' && typeof expressionValue !== 'number') {
          return;
        }

        value += expressionValue;
        value += unwrapped.quasis[index + 1]?.cooked ?? unwrapped.quasis[index + 1]?.raw ?? '';
      }

      return value;
    }

    if (unwrapped?.type === 'Identifier') {
      const key = getIdentifierKey(unwrapped);
      if (seen.has(key)) {
        return;
      }

      const binding = constantBindings.get(key);
      return binding ? resolveConstant(binding, new Set([...seen, key])) : undefined;
    }

    if (unwrapped?.type === 'ObjectExpression') {
      const object = new Map();
      for (const property of unwrapped.properties) {
        if (property.type !== 'KeyValueProperty') {
          continue;
        }

        const propertyName = getPropertyName(property.key);
        if (propertyName !== undefined) {
          object.set(propertyName, resolveConstant(property.value, seen));
        }
      }
      return object;
    }

    if (unwrapped?.type === 'MemberExpression') {
      const object = resolveConstant(unwrapped.object, seen);
      const propertyName = getPropertyName(unwrapped.property);
      return object instanceof Map && propertyName !== undefined
        ? object.get(propertyName)
        : undefined;
    }
  };

  const replacements = [];
  visitAst(ast, (node) => {
    if (node.type !== 'TsEnumDeclaration') {
      return;
    }

    for (const member of node.members) {
      const value = resolveConstant(member.init);
      if (typeof value === 'string') {
        replacements.push({ span: member.init.span, value: JSON.stringify(value) });
      }
    }
  });

  return replacements.length === 0 ? sourceText : replaceSourceSpans(sourceText, ast, replacements);
}

// Babel's Jest hoist moves jest.mock() calls above local declarations. Resolve each identifier
// through SWC's binding context so only the literal visible at that call site is inlined.
function inlineDynamicJestMockNames(sourceText, sourcePath) {
  if (!/\bjest\s*\.\s*mock\s*\(\s*[A-Za-z_$][\w$]*\s*,/.test(sourceText)) {
    return sourceText;
  }

  const ast = parseSource(sourceText, sourcePath);
  const moduleNames = new Map();

  visitAst(ast, (node) => {
    if (node.type !== 'VariableDeclaration' || node.kind !== 'const') {
      return;
    }

    for (const declaration of node.declarations) {
      if (declaration.id.type !== 'Identifier') {
        continue;
      }

      const moduleName = getStringLiteralValue(declaration.init);
      if (moduleName === undefined) {
        continue;
      }

      const key = getIdentifierKey(declaration.id);
      const declarations = moduleNames.get(key) ?? [];
      declarations.push(moduleName);
      moduleNames.set(key, declarations);
    }
  });

  const replacements = [];

  visitAst(ast, (node) => {
    if (
      node.type !== 'CallExpression' ||
      node.callee.type !== 'MemberExpression' ||
      node.callee.object.type !== 'Identifier' ||
      node.callee.object.value !== 'jest' ||
      node.callee.property.type !== 'Identifier' ||
      node.callee.property.value !== 'mock'
    ) {
      return;
    }

    const moduleName = node.arguments[0]?.expression;
    if (moduleName?.type !== 'Identifier') {
      return;
    }

    const declarations = moduleNames.get(getIdentifierKey(moduleName));
    if (declarations?.length === 1) {
      replacements.push({ span: moduleName.span, value: JSON.stringify(declarations[0]) });
    }
  });

  return replacements.length === 0 ? sourceText : replaceSourceSpans(sourceText, ast, replacements);
}

// lazyObject is still implemented as a Babel macro. Keep this narrow fallback until the
// macro has an SWC implementation or can be replaced by a runtime API.
function requiresLazyObjectTransform(sourceText) {
  return sourceText.includes('@kbn/lazy-object') && /\blazyObject\s*\(/.test(sourceText);
}

// SWC treats enum members initialized from string constants as numeric members and emits a
// reverse mapping. Babel preserves the string-enum behavior expected from TypeScript.
function requiresComputedEnumTransform(sourceText, sourcePath) {
  if (!/\benum\b/.test(sourceText)) {
    return false;
  }

  let requiresTransform = false;
  visitAst(parseSource(sourceText, sourcePath), (node) => {
    if (node.type !== 'TsEnumDeclaration') {
      return;
    }

    requiresTransform ||= node.members.some((member) => {
      const initializer = unwrapExpression(member.init);
      return (
        initializer?.type === 'Identifier' ||
        initializer?.type === 'MemberExpression' ||
        initializer?.type === 'TemplateLiteral'
      );
    });
  });

  return requiresTransform;
}

function requiresBabelTransform(sourceText, sourcePath) {
  return (
    requiresLazyObjectTransform(sourceText) ||
    requiresComputedEnumTransform(sourceText, sourcePath) ||
    requiresBabelJestHoist(sourceText)
  );
}

function getUninstrumentedOptions(transformOptions) {
  return transformOptions?.instrument
    ? {
        ...transformOptions,
        instrument: false,
      }
    : transformOptions;
}

function isDefinePropertyCall(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.value === 'Object' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.value === 'defineProperty'
  );
}

function isGeneratedExportHelper(functionDeclaration, target) {
  return (
    functionDeclaration?.type === 'FunctionDeclaration' &&
    /^_export(?:_star)?\d*$/.test(functionDeclaration.identifier?.value ?? '') &&
    functionDeclaration.params.some(
      ({ pat }) => pat.type === 'Identifier' && pat.value === target.value
    )
  );
}

function makeExportsConfigurable(result, transformOptions, exportNames) {
  if (!result?.code || transformOptions?.supportsStaticESM) {
    return result;
  }

  const ast = parseSource(result.code, '/__kbn_jest_generated__.js');
  const replacements = [];

  // SWC emits live named exports as non-configurable getters. Restrict changes to explicit
  // exports and SWC's generated export helpers so user Object.defineProperty() calls are intact.
  visitAstWithAncestors(ast, (node, ancestors) => {
    if (!isDefinePropertyCall(node)) {
      return;
    }

    const target = node.arguments[0]?.expression;
    const exportName = node.arguments[1]?.expression;
    const descriptor = node.arguments[2]?.expression;
    if (
      target?.type !== 'Identifier' ||
      descriptor?.type !== 'ObjectExpression' ||
      descriptor.properties.some(
        (property) =>
          property.type === 'KeyValueProperty' &&
          (getPropertyName(property.key) === 'configurable' ||
            getPropertyName(property.key) === 'set')
      )
    ) {
      return;
    }

    const functionDeclaration = ancestors.findLast(
      (ancestor) => ancestor.type === 'FunctionDeclaration'
    );
    const isExplicitExport =
      target.value === 'exports' &&
      exportName?.type === 'StringLiteral' &&
      exportNames.has(exportName.value);
    if (!isExplicitExport && !isGeneratedExportHelper(functionDeclaration, target)) {
      return;
    }

    const enumerableProperty = descriptor.properties.find(
      (property) =>
        property.type === 'KeyValueProperty' &&
        getPropertyName(property.key) === 'enumerable' &&
        property.value.type === 'BooleanLiteral' &&
        property.value.value
    );
    if (!enumerableProperty || !exportName) {
      return;
    }

    const enumerableSpan = {
      start: enumerableProperty.key.span.start,
      end: enumerableProperty.value.span.end,
    };
    const propertyText = getSourceSpanText(result.code, ast, enumerableSpan);
    const exportNameText = getSourceSpanText(result.code, ast, exportName.span);
    replacements.push({
      span: enumerableSpan,
      value:
        `${propertyText}, configurable: true, ` +
        `set: ((name) => function(value) { ` +
        `Object.defineProperty(this, name, ` +
        `{ value, writable: true, enumerable: true, configurable: true }); ` +
        `})(${exportNameText})`,
    });
  });

  return replacements.length === 0
    ? result
    : { ...result, code: replaceSourceSpans(result.code, ast, replacements) };
}

function makeExportsTdzSafe(result, transformOptions) {
  if (!result?.code || transformOptions?.supportsStaticESM) {
    return result;
  }

  // Babel initializes CommonJS export slots to undefined before loading dependencies. SWC
  // exposes live getters instead, which can throw when a circular dependency observes a local
  // const before initialization. Preserve live bindings while matching Babel during the cycle.
  const code = result.code
    .replace(
      /get: Object\.getOwnPropertyDescriptor\(all, name\)\.get/g,
      `get: ((getter) => function() { try { return getter(); } catch (error) { if (error instanceof ReferenceError) return undefined; throw error; } })(Object.getOwnPropertyDescriptor(all, name).get)`
    )
    .replace(
      /get: function\(\) \{\n(\s*)return ([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*);\n(\s*)\}/g,
      `get: function() {\n$1try { return $2; } catch (error) { if (error instanceof ReferenceError) return undefined; throw error; }\n$3}`
    );

  return code === result.code ? result : { ...result, code };
}

function getBindingIdentifiers(pattern) {
  if (!pattern) {
    return [];
  }

  if (pattern.type === 'Identifier') {
    return [pattern];
  }

  if (pattern.type === 'ArrayPattern') {
    return pattern.elements.flatMap((element) => getBindingIdentifiers(element));
  }

  if (pattern.type === 'ObjectPattern') {
    return pattern.properties.flatMap((property) =>
      getBindingIdentifiers(
        property.type === 'KeyValuePatternProperty' ? property.value : property.argument
      )
    );
  }

  if (pattern.type === 'AssignmentPattern' || pattern.type === 'RestElement') {
    return getBindingIdentifiers(pattern.left ?? pattern.argument);
  }

  return [];
}

function getDeclarationIdentifiers(declaration, immutableOnly = false) {
  if (
    declaration?.type === 'VariableDeclaration' &&
    (!immutableOnly || declaration.kind === 'const')
  ) {
    return declaration.declarations.flatMap(({ id }) => getBindingIdentifiers(id));
  }

  if (declaration?.type === 'FunctionDeclaration' || declaration?.type === 'ClassDeclaration') {
    return declaration.identifier ? [declaration.identifier] : [];
  }

  return [];
}

function getExportMetadata(sourceText, sourcePath) {
  if (!/\bexport\b/.test(sourceText)) {
    return { exportNames: new Set(), immutableLocalExportNames: new Set() };
  }

  const ast = parseSource(sourceText, sourcePath);
  const stableBindings = new Set();

  for (const item of ast.body) {
    const declaration = item.type === 'ExportDeclaration' ? item.declaration : item;
    for (const identifier of getDeclarationIdentifiers(declaration, true)) {
      stableBindings.add(getIdentifierKey(identifier));
    }
  }

  const exportNames = new Set();
  const immutableLocalExportNames = new Set();

  for (const item of ast.body) {
    if (item.type === 'ExportDeclaration') {
      for (const identifier of getDeclarationIdentifiers(item.declaration)) {
        exportNames.add(identifier.value);
        if (stableBindings.has(getIdentifierKey(identifier))) {
          immutableLocalExportNames.add(identifier.value);
        }
      }
      continue;
    }

    if (item.type === 'ExportDefaultDeclaration' || item.type === 'ExportDefaultExpression') {
      exportNames.add('default');
      continue;
    }

    if (item.type !== 'ExportNamedDeclaration' || item.typeOnly) {
      continue;
    }

    for (const specifier of item.specifiers) {
      if (specifier.type === 'ExportSpecifier' && !specifier.isTypeOnly) {
        const exportName = specifier.exported?.value ?? specifier.orig.value;
        exportNames.add(exportName);
        if (
          !item.source &&
          specifier.orig.type === 'Identifier' &&
          stableBindings.has(getIdentifierKey(specifier.orig))
        ) {
          immutableLocalExportNames.add(exportName);
        }
      } else if (specifier.type === 'ExportNamespaceSpecifier') {
        exportNames.add(specifier.name.value);
      } else if (specifier.type === 'ExportDefaultSpecifier') {
        exportNames.add(specifier.exported.value);
      }
    }
  }

  immutableLocalExportNames.delete('default');
  return { exportNames, immutableLocalExportNames };
}

function appendCompatibilityStatements(result, statements) {
  if (statements.length === 0) {
    return result;
  }

  const joinedStatements = statements.join(' ');
  const sourceMapIndex = result.code.lastIndexOf('\n//# sourceMappingURL=');
  const trailingLineBreak = sourceMapIndex === -1 ? result.code.match(/\r?\n$/)?.[0] : undefined;
  const insertionIndex =
    sourceMapIndex === -1 ? result.code.length - (trailingLineBreak?.length ?? 0) : sourceMapIndex;
  const code = `${result.code.slice(0, insertionIndex)} ${joinedStatements}${result.code.slice(
    insertionIndex
  )}`;

  return { ...result, code };
}

function makeLocalExportsWritable(result, transformOptions, exportNames) {
  if (!result?.code || transformOptions?.supportsStaticESM || exportNames.size === 0) {
    return result;
  }

  // Babel namespace imports copy data descriptors but preserve accessors. Materialize immutable
  // local exports after initialization so Jest and Sinon can replace them without affecting
  // mutable or re-exported live bindings.
  const statements = [...exportNames].map(
    (exportName) =>
      `Object.defineProperty(exports, ${JSON.stringify(exportName)}, ` +
      `{ value: exports[${JSON.stringify(
        exportName
      )}], writable: true, enumerable: true, configurable: true });`
  );

  return appendCompatibilityStatements(result, statements);
}

function unwrapCallee(callee) {
  if (callee?.type === 'ParenthesisExpression') {
    return unwrapCallee(callee.expression);
  }

  if (callee?.type === 'SequenceExpression') {
    return unwrapCallee(callee.expressions.at(-1));
  }

  return callee;
}

function isEmotionModuleName(value) {
  return value === '@emotion/react' || value === '@emotion/css';
}

function getEmotionCssBindings(ast) {
  const directBindings = new Set();
  const namespaceBindings = new Set();

  for (const item of ast.body) {
    if (item.type === 'ImportDeclaration' && isEmotionModuleName(item.source.value)) {
      for (const specifier of item.specifiers) {
        if (
          specifier.type === 'ImportSpecifier' &&
          (specifier.imported?.value ?? specifier.local.value) === 'css'
        ) {
          directBindings.add(getIdentifierKey(specifier.local));
        } else if (specifier.type === 'ImportNamespaceSpecifier') {
          namespaceBindings.add(getIdentifierKey(specifier.local));
        }
      }
      continue;
    }

    if (item.type !== 'VariableDeclaration') {
      continue;
    }

    for (const declaration of item.declarations) {
      const initializer = unwrapExpression(declaration.init);
      if (
        declaration.id.type === 'Identifier' &&
        initializer?.type === 'CallExpression' &&
        initializer.callee.type === 'Identifier' &&
        initializer.callee.value === 'require' &&
        initializer.arguments[0]?.expression.type === 'StringLiteral' &&
        isEmotionModuleName(initializer.arguments[0].expression.value)
      ) {
        namespaceBindings.add(getIdentifierKey(declaration.id));
      }
    }
  }

  return { directBindings, namespaceBindings };
}

function isEmotionCssCallee(callee, bindings) {
  const unwrapped = unwrapCallee(callee);
  if (unwrapped?.type === 'Identifier') {
    return bindings.directBindings.has(getIdentifierKey(unwrapped));
  }

  return (
    unwrapped?.type === 'MemberExpression' &&
    unwrapped.object.type === 'Identifier' &&
    bindings.namespaceBindings.has(getIdentifierKey(unwrapped.object)) &&
    unwrapped.property.type === 'Identifier' &&
    unwrapped.property.value === 'css'
  );
}

function makeEmotionLabelsSafe(result) {
  if (!result?.code || !result.code.includes('label:')) {
    return result;
  }

  const ast = parseSource(result.code, '/__kbn_jest_generated__.js');
  const bindings = getEmotionCssBindings(ast);
  const source = Buffer.from(result.code);
  const sourceStart = ast[SOURCE_START];
  const replacements = [];

  // The SWC plugin emits labels as a separate css() argument. Add a delimiter when the template
  // tail has none, reusing the formatter's preceding space so generated positions do not move.
  visitAst(ast, (node) => {
    if (node.type !== 'CallExpression' || !isEmotionCssCallee(node.callee, bindings)) {
      return;
    }

    const label = node.arguments.at(-1)?.expression;
    if (label?.type !== 'StringLiteral' || !label.value.startsWith('label:')) {
      return;
    }

    const previousArgument = node.arguments.at(-2)?.expression;
    if (
      previousArgument?.type === 'StringLiteral' &&
      previousArgument.value.trimEnd().endsWith(';')
    ) {
      return;
    }

    const labelStart = label.span.start - sourceStart;
    if (source[labelStart - 1] !== 32 && source[labelStart - 1] !== 9) {
      throw new Error('Unable to safely delimit an Emotion label without changing source maps');
    }

    const labelText = getSourceSpanText(result.code, ast, label.span);
    replacements.push({
      span: { start: label.span.start - 1, end: label.span.end },
      value: `${labelText[0]};${labelText.slice(1)}`,
    });
  });

  return replacements.length === 0
    ? result
    : { ...result, code: replaceSourceSpans(result.code, ast, replacements) };
}

function stripSourceMapNames(result) {
  if (!result?.map || typeof result.map !== 'string') {
    return result;
  }

  const sourceMap = JSON.parse(result.map);
  if (!Array.isArray(sourceMap.names) || sourceMap.names.length === 0) {
    return result;
  }

  const base64Characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const mappings = sourceMap.mappings.replace(/[^,;]+/g, (segment) => {
    let index = 0;
    let field = 0;

    while (index < segment.length) {
      field += 1;
      if (field === 5) {
        return segment.slice(0, index);
      }

      let digit;
      do {
        digit = base64Characters.indexOf(segment[index]);
        index += 1;
      } while (digit >= 0 && (digit & 32) !== 0);
    }

    return segment;
  });

  return {
    ...result,
    map: JSON.stringify({ ...sourceMap, names: [], mappings }),
  };
}

function applyCommonJsCompatibility(result, transformOptions, sourceText, sourcePath) {
  const { exportNames, immutableLocalExportNames } = getExportMetadata(sourceText, sourcePath);
  const compatibleResult = addModuleExportsCompatibility(
    makeExportsConfigurable(
      makeExportsTdzSafe(
        makeLocalExportsWritable(
          makeEmotionLabelsSafe(result),
          transformOptions,
          immutableLocalExportNames
        ),
        transformOptions
      ),
      transformOptions,
      exportNames
    ),
    transformOptions
  );

  // SWC name mappings can associate a React component frame with a nested callback. Keep the
  // original source locations while allowing V8 to report the generated function's actual name.
  return stripSourceMapNames(compatibleResult);
}

function addModuleExportsCompatibility(result, transformOptions) {
  if (!result?.code || transformOptions?.supportsStaticESM) {
    return result;
  }

  // The previous Babel pipeline exposed a sole default export directly through
  // module.exports. Preserve that behavior for CommonJS require() consumers.
  const exportNames = new Set();
  const exportPattern =
    /(?:exports\.([A-Za-z_$][\w$]*)\s*=|Object\.defineProperty\(exports,\s*(?:(?:\/\*[\s\S]*?\*\/|\/\/[^\r\n]*(?:\r?\n|$))\s*)*["']([^"']+)["'])/g;

  for (const match of result.code.matchAll(exportPattern)) {
    exportNames.add(match[1] ?? match[2]);
  }

  exportNames.delete('__esModule');

  if (
    !exportNames.has('default') ||
    exportNames.size !== 1 ||
    result.code.includes('@swc/helpers/_/_export_star') ||
    result.code.includes('function _export_star(')
  ) {
    return result;
  }

  return appendCompatibilityStatements(result, ['module.exports = exports.default;']);
}

function serializeJestTransformConfig(config) {
  const transform = Object.fromEntries(
    Object.entries(config?.transform ?? {})
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([pattern, value]) => [
        pattern,
        Array.isArray(value) ? [String(value[0]), value[1] ?? null] : String(value),
      ])
  );
  const transformIgnorePatterns = (config?.transformIgnorePatterns ?? []).map(String);

  return JSON.stringify({ transform, transformIgnorePatterns });
}

const transformer = {
  canInstrument: false,

  process(sourceText, sourcePath, transformOptions) {
    if (requiresBabelTransform(sourceText, sourcePath)) {
      const selectedBabelTransformer = transformOptions?.supportsStaticESM
        ? babelEsmTransformer
        : babelTransformer;
      const compatibleSourceText = inlineComputedEnumValues(sourceText, sourcePath);
      const { exportNames } = getExportMetadata(sourceText, sourcePath);
      const result = selectedBabelTransformer.process(
        inlineDynamicJestMockNames(compatibleSourceText, sourcePath),
        sourcePath,
        getUninstrumentedOptions(transformOptions)
      );
      return makeExportsConfigurable(result, transformOptions, exportNames);
    }

    const normalizedSource = normalizeMultilineJsxStringAttributes(sourceText, sourcePath);
    const result = composeSourceMaps(
      getSwcTransformer(sourcePath).process(normalizedSource.code, sourcePath, transformOptions),
      normalizedSource.map
    );
    return applyCommonJsCompatibility(result, transformOptions, sourceText, sourcePath);
  },

  async processAsync(sourceText, sourcePath, transformOptions) {
    if (requiresBabelTransform(sourceText, sourcePath)) {
      const selectedBabelTransformer = transformOptions?.supportsStaticESM
        ? babelEsmTransformer
        : babelTransformer;
      const compatibleSourceText = inlineComputedEnumValues(sourceText, sourcePath);
      const { exportNames } = getExportMetadata(sourceText, sourcePath);
      const result = await selectedBabelTransformer.processAsync(
        inlineDynamicJestMockNames(compatibleSourceText, sourcePath),
        sourcePath,
        getUninstrumentedOptions(transformOptions)
      );
      return makeExportsConfigurable(result, transformOptions, exportNames);
    }

    const selectedSwcTransformer = getSwcTransformer(sourcePath);
    const normalizedSource = normalizeMultilineJsxStringAttributes(sourceText, sourcePath);
    const result = transformOptions?.supportsStaticESM
      ? await selectedSwcTransformer.processAsync(
          normalizedSource.code,
          sourcePath,
          transformOptions
        )
      : selectedSwcTransformer.process(normalizedSource.code, sourcePath, transformOptions);
    return applyCommonJsCompatibility(
      composeSourceMaps(result, normalizedSource.map),
      transformOptions,
      sourceText,
      sourcePath
    );
  },

  getCacheKey(sourceText, sourcePath, transformOptions) {
    const config = transformOptions?.config ?? {};
    const rootDir = Path.resolve(config.rootDir ?? process.cwd());
    const hash = Crypto.createHash('sha256');

    hash.update(THIS_FILE);
    hash.update('\0');
    hash.update(SWC_CORE_VERSION);
    hash.update('\0');
    hash.update(SWC_JEST_VERSION);
    hash.update('\0');
    hash.update(EMOTION_PLUGIN_VERSION);
    hash.update('\0');
    hash.update(JSON.stringify(getJestSwcConfig(sourcePath)));
    hash.update('\0');
    hash.update(serializeJestTransformConfig(config));
    hash.update('\0');
    hash.update(rootDir);
    hash.update('\0');
    hash.update(Path.relative(rootDir, Path.resolve(sourcePath)));
    hash.update('\0');
    hash.update(transformOptions?.instrument ? 'instrument' : 'no-instrument');
    hash.update('\0');
    hash.update(transformOptions?.supportsStaticESM ? 'esm' : 'commonjs');
    hash.update('\0');
    hash.update(process.env.NODE_ENV ?? '');
    hash.update('\0');
    hash.update(process.version);
    hash.update('\0');
    hash.update(sourceText);

    if (requiresBabelTransform(sourceText, sourcePath)) {
      hash.update('\0babel-compatibility\0');
      const selectedBabelTransformer = transformOptions?.supportsStaticESM
        ? babelEsmTransformer
        : babelTransformer;
      hash.update(
        selectedBabelTransformer.getCacheKey(sourceText, sourcePath, transformOptions).toString()
      );
    }

    return hash.digest('hex').slice(0, 32);
  },
};

module.exports = transformer;
