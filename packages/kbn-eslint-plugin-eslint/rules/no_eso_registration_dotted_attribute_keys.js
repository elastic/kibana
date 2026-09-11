/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Fs = require('fs');
const Path = require('path');

/**
 * ESO encrypts/decrypts attributes by flat key lookup (`attributes[key]`), so a
 * dotted string like `'ssl.key'` names a top-level attribute literally called
 * `ssl.key` — it does not reach the nested path `attributes.ssl.key`. A dotted
 * entry in `attributesToEncrypt` or `attributesToIncludeInAAD` therefore either
 * silently fails to encrypt or silently drops out of the AAD.
 *
 * Dotted values are usually not written inline; they arrive through an enum
 * member (`ConfigKey.TLS_KEY`), a constant array, or a spread of one — and those
 * constants normally live in a different file. This rule follows those
 * references across files (via the Kibana import resolver) so the check holds
 * wherever the value is actually declared.
 */

const TARGET_PROPS = new Set(['attributesToEncrypt', 'attributesToIncludeInAAD']);

/** Bounds how many import hops are followed; also the cycle guard. */
const MAX_RESOLVE_DEPTH = 6;

/**
 * Parsed top-level declarations for a file, keyed by absolute path and
 * invalidated on mtime change so editors pick up edits to imported files.
 * @type {Map<string, { mtimeMs: number, scope: FileScope | null }>}
 */
const fileScopeCache = new Map();

/** `undefined` = not yet attempted, `null` = unavailable. */
let importResolver;

/**
 * @typedef {Object} FileScope
 * @property {string} dirname
 * @property {Map<string, Object>} enums "EnumName.MemberName" -> initializer node
 * @property {Set<string>} enumNames
 * @property {Map<string, Object>} vars variable name -> initializer node
 * @property {Map<string, { source: string, importedName: string }>} imports local/re-exported name -> origin
 * @property {string[]} starExports sources of `export * from '...'`
 */

const getImportResolver = () => {
  if (importResolver !== undefined) return importResolver;
  try {
    const { ImportResolver } = require('@kbn/import-resolver');
    const { REPO_ROOT } = require('@kbn/repo-info');
    importResolver = ImportResolver.create(REPO_ROOT);
  } catch (e) {
    // Outside the repo tooling (e.g. a bare RuleTester run) cross-file
    // resolution is unavailable; same-file analysis still applies.
    importResolver = null;
  }
  return importResolver;
};

const unwrapTs = (node) => {
  let current = node;
  while (
    current &&
    (current.type === 'TSAsExpression' ||
      current.type === 'TSTypeAssertion' ||
      current.type === 'TSSatisfiesExpression' ||
      current.type === 'TSNonNullExpression')
  ) {
    current = current.expression;
  }
  return current;
};

const getEnumMembers = (enumNode) =>
  (enumNode.body ? enumNode.body.members : enumNode.members) || [];

const findProp = (objectNode, name) =>
  objectNode.properties.find(
    (p) =>
      p.type === 'Property' &&
      !p.computed &&
      ((p.key.type === 'Identifier' && p.key.name === name) ||
        (p.key.type === 'Literal' && p.key.value === name))
  );

/**
 * Collect the top-level declarations, imports and re-exports of a parsed file.
 *
 * @param {Object} programNode
 * @param {string} dirname
 * @returns {FileScope}
 */
const buildFileScope = (programNode, dirname) => {
  /** @type {FileScope} */
  const scope = {
    dirname,
    enums: new Map(),
    enumNames: new Set(),
    vars: new Map(),
    imports: new Map(),
    starExports: [],
  };

  const addDeclaration = (decl) => {
    if (!decl) return;

    if (decl.type === 'TSEnumDeclaration') {
      scope.enumNames.add(decl.id.name);
      for (const member of getEnumMembers(decl)) {
        if (!member.initializer) continue;
        const memberName = member.id.type === 'Identifier' ? member.id.name : member.id.value;
        scope.enums.set(`${decl.id.name}.${memberName}`, member.initializer);
      }
      return;
    }

    if (decl.type === 'VariableDeclaration') {
      for (const declarator of decl.declarations) {
        if (declarator.id.type === 'Identifier' && declarator.init) {
          scope.vars.set(declarator.id.name, declarator.init);
        }
      }
    }
  };

  for (const statement of programNode.body) {
    switch (statement.type) {
      case 'ImportDeclaration':
        for (const spec of statement.specifiers) {
          const source = statement.source.value;
          if (spec.type === 'ImportSpecifier') {
            const importedName =
              spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value;
            scope.imports.set(spec.local.name, { source, importedName });
          } else if (spec.type === 'ImportDefaultSpecifier') {
            scope.imports.set(spec.local.name, { source, importedName: 'default' });
          } else if (spec.type === 'ImportNamespaceSpecifier') {
            scope.imports.set(spec.local.name, { source, importedName: '*' });
          }
        }
        break;

      case 'ExportNamedDeclaration':
        if (statement.declaration) {
          addDeclaration(statement.declaration);
        } else if (statement.source) {
          // `export { a as b } from './x'` — reachable from other files under `b`.
          for (const spec of statement.specifiers) {
            const local = spec.local.type === 'Identifier' ? spec.local.name : spec.local.value;
            const exported =
              spec.exported.type === 'Identifier' ? spec.exported.name : spec.exported.value;
            scope.imports.set(exported, { source: statement.source.value, importedName: local });
          }
        }
        break;

      case 'ExportAllDeclaration':
        scope.starExports.push(statement.source.value);
        break;

      default:
        addDeclaration(statement);
    }
  }

  return scope;
};

/**
 * Parse a file from disk and build its scope, memoized on mtime.
 *
 * @param {string} absolutePath
 * @returns {FileScope | null}
 */
const loadFileScope = (absolutePath) => {
  let stat;
  try {
    stat = Fs.statSync(absolutePath);
  } catch (e) {
    return null;
  }

  const cached = fileScopeCache.get(absolutePath);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return cached.scope;
  }

  let scope = null;
  try {
    const { parse } = require('@typescript-eslint/typescript-estree');
    const code = Fs.readFileSync(absolutePath, 'utf8');
    const ast = parse(code, { jsx: absolutePath.endsWith('x') });
    scope = buildFileScope(ast, Path.dirname(absolutePath));
  } catch (e) {
    scope = null;
  }

  fileScopeCache.set(absolutePath, { mtimeMs: stat.mtimeMs, scope });
  return scope;
};

/**
 * @param {string} source
 * @param {string} fromDirname
 * @returns {FileScope | null}
 */
const resolveToFileScope = (source, fromDirname) => {
  const resolver = getImportResolver();
  if (!resolver) return null;

  let result;
  try {
    result = resolver.resolve(source, fromDirname);
  } catch (e) {
    return null;
  }

  // Skip third-party code: it can't declare Kibana saved object attributes and
  // parsing node_modules would be needlessly expensive.
  if (!result || result.type !== 'file' || result.nodeModule) return null;
  if (!/\.[cm]?[jt]sx?$/.test(result.absolute)) return null;

  return loadFileScope(result.absolute);
};

/**
 * Resolve a name to its declaration, following imports, re-exports and
 * `export *` chains into other files.
 *
 * @returns {{ kind: 'value', node: Object, scope: FileScope }
 *   | { kind: 'enum', enumName: string, scope: FileScope }
 *   | { kind: 'namespace', scope: FileScope }
 *   | null}
 */
const lookupBinding = (name, scope, depth) => {
  if (!scope || depth > MAX_RESOLVE_DEPTH) return null;

  if (scope.vars.has(name)) {
    return { kind: 'value', node: scope.vars.get(name), scope };
  }
  if (scope.enumNames.has(name)) {
    return { kind: 'enum', enumName: name, scope };
  }

  const imported = scope.imports.get(name);
  if (imported) {
    const target = resolveToFileScope(imported.source, scope.dirname);
    if (!target) return null;
    if (imported.importedName === '*') return { kind: 'namespace', scope: target };
    return lookupBinding(imported.importedName, target, depth + 1);
  }

  for (const source of scope.starExports) {
    const target = resolveToFileScope(source, scope.dirname);
    const found = target && lookupBinding(name, target, depth + 1);
    if (found) return found;
  }

  return null;
};

/**
 * Every dotted string value the expression can evaluate to, resolving
 * identifiers, enum members and spreads across files.
 *
 * @param {Object} node
 * @param {FileScope} scope file scope the node belongs to
 * @param {number} depth
 * @returns {string[]}
 */
const collectDottedValues = (node, scope, depth) => {
  const current = unwrapTs(node);
  if (!current || !scope || depth > MAX_RESOLVE_DEPTH) return [];

  switch (current.type) {
    case 'Literal':
      return typeof current.value === 'string' && current.value.includes('.')
        ? [current.value]
        : [];

    case 'Identifier': {
      const binding = lookupBinding(current.name, scope, depth);
      if (!binding || binding.kind !== 'value') return [];
      return collectDottedValues(binding.node, binding.scope, depth + 1);
    }

    case 'MemberExpression': {
      if (
        current.computed ||
        current.object.type !== 'Identifier' ||
        current.property.type !== 'Identifier'
      ) {
        return [];
      }

      const binding = lookupBinding(current.object.name, scope, depth);
      if (!binding) return [];

      if (binding.kind === 'enum') {
        const init = binding.scope.enums.get(`${binding.enumName}.${current.property.name}`);
        return init ? collectDottedValues(init, binding.scope, depth + 1) : [];
      }

      if (binding.kind === 'namespace') {
        const inner = lookupBinding(current.property.name, binding.scope, depth + 1);
        if (!inner || inner.kind !== 'value') return [];
        return collectDottedValues(inner.node, inner.scope, depth + 1);
      }

      const target = unwrapTs(binding.node);
      if (target.type === 'ObjectExpression') {
        const prop = findProp(target, current.property.name);
        return prop ? collectDottedValues(prop.value, binding.scope, depth + 1) : [];
      }
      return [];
    }

    case 'ArrayExpression':
      return current.elements.flatMap((el) => {
        if (!el) return [];
        if (el.type === 'SpreadElement') return collectDottedValues(el.argument, scope, depth);
        return collectDottedValues(el, scope, depth);
      });

    case 'ObjectExpression': {
      // The `{ key: 'ssl.key' }` / `{ key, dangerouslyExposeValue }` entry form.
      const keyProp = findProp(current, 'key');
      return keyProp ? collectDottedValues(keyProp.value, scope, depth) : [];
    }

    case 'NewExpression':
      if (
        current.callee.type === 'Identifier' &&
        current.callee.name === 'Set' &&
        current.arguments.length > 0
      ) {
        return collectDottedValues(current.arguments[0], scope, depth);
      }
      return [];

    default:
      return [];
  }
};

/** The array literal written directly at this node, if any. */
const directArrayOf = (node) => {
  const current = unwrapTs(node);
  if (!current) return null;
  if (current.type === 'ArrayExpression') return current;
  if (
    current.type === 'NewExpression' &&
    current.callee.type === 'Identifier' &&
    current.callee.name === 'Set' &&
    current.arguments.length > 0
  ) {
    const arg = unwrapTs(current.arguments[0]);
    return arg && arg.type === 'ArrayExpression' ? arg : null;
  }
  return null;
};

const uniq = (values) => [...new Set(values)].join(', ');

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow dotted attribute names in ESO attributesToEncrypt / attributesToIncludeInAAD registrations',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      dottedLiteral:
        "Dotted attribute key '{{key}}' in '{{prop}}' is matched by ESO as a flat top-level attribute, not a nested path. Use a flat attribute name — or encrypt the top-level object that contains it.",
      dottedRef:
        "'{{ref}}' in '{{prop}}' resolves to dotted attribute key(s): {{keys}}. ESO matches flat top-level attributes only, so these will not encrypt the nested values they name.",
      dottedSpread:
        "Spread of '{{ref}}' in '{{prop}}' contributes dotted attribute key(s): {{keys}}. ESO matches flat top-level attributes only, so these will not encrypt the nested values they name.",
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.getSourceCode();
    const filename = context.getFilename();

    /** @type {Array<{ valueNode: Object, propName: string }>} */
    const pendingChecks = [];
    /** Guards double-reporting when a shorthand property and its const both resolve here. */
    const checkedValueNodes = new WeakSet();

    const checkPropertyValue = (valueNode, propName, scope) => {
      if (checkedValueNodes.has(valueNode)) return;
      checkedValueNodes.add(valueNode);

      // `{ attributesToIncludeInAAD }` shorthand, or an alias of a local const:
      // follow it to the declaration so the report lands on the offending entry
      // rather than on the reference.
      const unwrappedValue = unwrapTs(valueNode);
      if (unwrappedValue.type === 'Identifier') {
        const binding = lookupBinding(unwrappedValue.name, scope, 0);
        if (binding && binding.kind === 'value' && binding.scope === scope) {
          checkPropertyValue(binding.node, propName, scope);
          return;
        }
      }

      const arr = directArrayOf(valueNode);

      // The set is built elsewhere (most often an import). Evaluate the whole
      // reference and report on the node written in this file.
      if (!arr) {
        const dotted = collectDottedValues(valueNode, scope, 0);
        if (dotted.length > 0) {
          context.report({
            node: valueNode,
            messageId: 'dottedRef',
            data: { ref: sourceCode.getText(valueNode), prop: propName, keys: uniq(dotted) },
          });
        }
        return;
      }

      for (const el of arr.elements) {
        if (!el) continue;

        if (el.type === 'SpreadElement') {
          const dotted = collectDottedValues(el.argument, scope, 0);
          if (dotted.length > 0) {
            context.report({
              node: el,
              messageId: 'dottedSpread',
              data: {
                ref: sourceCode.getText(el.argument),
                prop: propName,
                keys: uniq(dotted),
              },
            });
          }
          continue;
        }

        const unwrapped = unwrapTs(el);
        if (unwrapped.type === 'Literal') {
          if (typeof unwrapped.value === 'string' && unwrapped.value.includes('.')) {
            context.report({
              node: el,
              messageId: 'dottedLiteral',
              data: { key: unwrapped.value, prop: propName },
            });
          }
          continue;
        }

        const dotted = collectDottedValues(el, scope, 0);
        if (dotted.length > 0) {
          context.report({
            node: el,
            messageId: 'dottedRef',
            data: { ref: sourceCode.getText(el), prop: propName, keys: uniq(dotted) },
          });
        }
      }
    };

    return {
      Property(node) {
        if (!node.computed && node.key.type === 'Identifier' && TARGET_PROPS.has(node.key.name)) {
          pendingChecks.push({ valueNode: node.value, propName: node.key.name });
        }
      },

      'Program:exit'(programNode) {
        // A registration set may be declared on its own and referenced elsewhere.
        const standaloneNames = [];
        for (const statement of programNode.body) {
          const decl =
            statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
          if (!decl || decl.type !== 'VariableDeclaration') continue;
          for (const declarator of decl.declarations) {
            if (declarator.id.type === 'Identifier' && TARGET_PROPS.has(declarator.id.name)) {
              standaloneNames.push(declarator.id.name);
            }
          }
        }

        if (pendingChecks.length === 0 && standaloneNames.length === 0) return;

        const scope = buildFileScope(programNode, Path.dirname(filename));

        for (const name of standaloneNames) {
          const init = scope.vars.get(name);
          if (init) pendingChecks.push({ valueNode: init, propName: name });
        }

        for (const { valueNode, propName } of pendingChecks) {
          checkPropertyValue(valueNode, propName, scope);
        }
      },
    };
  },
};
