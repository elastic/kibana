/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @typedef {import("eslint").Rule.RuleModule} Rule */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.Node} Node */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.Expression} Expression */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.Identifier} Identifier */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.ImportDeclaration} ImportDeclaration */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.VariableDeclarator} VariableDeclarator */
/** @typedef {import("@typescript-eslint/typescript-estree").TSESTree.Property} Property */

const tsEstree = require('@typescript-eslint/typescript-estree');
const esTypes = tsEstree.AST_NODE_TYPES;

const ZOD_SOURCES = new Set(['@kbn/zod', '@kbn/zod/v4', 'zod', 'zod/v4', 'zod/v3']);
const AUTO_FIX_SCHEMA_METHODS = new Set([
  'array',
  'boolean',
  'default',
  'describe',
  'discriminatedUnion',
  'enum',
  'extend',
  'int',
  'literal',
  'max',
  'min',
  'nullable',
  'number',
  'object',
  'omit',
  'optional',
  'pick',
  'record',
  'refine',
  'string',
  'superRefine',
  'tuple',
  'union',
]);

const UNWRAP_TYPES = new Set([
  esTypes.TSAsExpression,
  esTypes.TSSatisfiesExpression,
  esTypes.TSNonNullExpression,
  esTypes.ChainExpression,
]);

/**
 * @param {string} source
 * @returns {boolean}
 */
const isZodModuleSource = (source) => ZOD_SOURCES.has(source);

/**
 * @param {Node | null | undefined} node
 * @returns {string | undefined}
 */
const getImportedName = (node) => {
  if (!node) {
    return undefined;
  }
  if (node.type === esTypes.Identifier) {
    return node.name;
  }
  if (node.type === esTypes.Literal && typeof node.value === 'string') {
    return node.value;
  }
  return undefined;
};

/**
 * @param {ImportDeclaration} node
 * @param {FileState} state
 */
const recordImportBindings = (node, state) => {
  if (node.importKind === 'type' || !node.source || typeof node.source.value !== 'string') {
    return;
  }
  if (!isZodModuleSource(node.source.value)) {
    return;
  }
  const hasLazySchemaExport =
    node.source.value === '@kbn/zod' || node.source.value === '@kbn/zod/v4';

  for (const spec of node.specifiers) {
    if (spec.importKind === 'type' || !spec.local?.name) {
      continue;
    }

    if (spec.type === esTypes.ImportDefaultSpecifier) {
      state.zodNamespaces.add(spec.local.name);
      continue;
    }
    if (spec.type === esTypes.ImportNamespaceSpecifier) {
      state.zodNamespaces.add(spec.local.name);
      if (hasLazySchemaExport) {
        state.zodImports.set(spec.local.name, { node, namespace: true, name: spec.local.name });
      }
      continue;
    }

    if (spec.type === esTypes.ImportSpecifier) {
      const importedName = getImportedName(spec.imported);
      if (importedName === 'z') {
        state.zodNamespaces.add(spec.local.name);
        if (hasLazySchemaExport) {
          state.zodImports.set(spec.local.name, { node, namespace: false, name: spec.local.name });
        }
      } else if (importedName === 'lazySchema') {
        state.lazySchemaNames.add(spec.local.name);
      }
    }
  }
};

/**
 * @param {Expression | undefined} node
 * @returns {Expression | undefined}
 */
const unwrapExpression = (node) => {
  let current = node;
  while (current && UNWRAP_TYPES.has(current.type)) {
    current = current.expression;
  }
  return current;
};

/**
 * Walks CallExpression.callee / MemberExpression.object to the root Identifier.
 * @param {Expression | undefined} node
 * @returns {Identifier | null}
 */
const getChainRootIdentifier = (node) => {
  let current = unwrapExpression(node);
  while (current) {
    if (current.type === esTypes.CallExpression) {
      current = unwrapExpression(current.callee);
      continue;
    }
    if (current.type === esTypes.MemberExpression) {
      current = unwrapExpression(current.object);
      continue;
    }
    if (current.type === esTypes.Identifier) {
      return current;
    }
    return null;
  }
  return null;
};

/**
 * @param {Expression | undefined} node
 * @returns {{ hasCall: boolean; firstMember: string | null }}
 */
const inspectZodChain = (node) => {
  let current = unwrapExpression(node);
  let hasCall = false;
  let firstMember = null;
  while (current) {
    if (current.type === esTypes.CallExpression) {
      hasCall = true;
      current = unwrapExpression(current.callee);
      continue;
    }
    if (current.type === esTypes.MemberExpression) {
      if (!current.computed && current.property.type === esTypes.Identifier) {
        firstMember = current.property.name;
      }
      current = unwrapExpression(current.object);
      continue;
    }
    break;
  }
  return { hasCall, firstMember };
};

/**
 * @typedef {{
 *   zodNamespaces: Set<string>;
 *   lazySchemaNames: Set<string>;
 *   zodImports: Map<string, { node: ImportDeclaration; namespace: boolean; name: string }>;
 *   importFixScheduled: boolean;
 *   schemaBindings: Set<string>;
 * }} FileState
 */

/**
 * True when init is a Zod-namespace builder chain (`z.object`, `z.lazy`, ...).
 * @param {Expression} init
 * @param {FileState} state
 * @returns {boolean}
 */
const isZodNamespaceChain = (init, state) => {
  const { hasCall } = inspectZodChain(init);
  if (!hasCall) {
    return false;
  }
  const root = getChainRootIdentifier(init);
  return Boolean(root && state.zodNamespaces.has(root.name));
};

/**
 * Root is a zod namespace and the first member is not `lazy`.
 * @param {Expression} init
 * @param {FileState} state
 * @returns {boolean}
 */
const isEagerZodNamespaceChain = (init, state) => {
  const { hasCall, firstMember } = inspectZodChain(init);
  if (!hasCall || firstMember === 'lazy' || firstMember === 'lazySchema') {
    return false;
  }
  const root = getChainRootIdentifier(init);
  return Boolean(root && state.zodNamespaces.has(root.name));
};

/**
 * True when init is `lazySchema(() => ...)` using a recorded lazySchema binding.
 * @param {Expression} init
 * @param {FileState} state
 * @returns {boolean}
 */
const isLazySchemaCall = (init, state) => {
  const unwrapped = unwrapExpression(init);
  if (!unwrapped || unwrapped.type !== esTypes.CallExpression) {
    return false;
  }
  const callee = unwrapExpression(unwrapped.callee);
  const namedHelper = callee?.type === esTypes.Identifier && state.lazySchemaNames.has(callee.name);
  const namespaceHelper =
    callee?.type === esTypes.MemberExpression &&
    !callee.computed &&
    callee.object.type === esTypes.Identifier &&
    callee.property.type === esTypes.Identifier &&
    callee.property.name === 'lazySchema' &&
    state.zodImports.get(callee.object.name)?.namespace;
  if (!namedHelper && !namespaceHelper) {
    return false;
  }
  if (unwrapped.arguments.length !== 1) {
    return false;
  }
  const [arg] = unwrapped.arguments;
  return arg.type === esTypes.ArrowFunctionExpression || arg.type === esTypes.FunctionExpression;
};

/**
 * Root identifier is in schemaBindings and the chain has at least one call.
 * @param {Expression} init
 * @param {FileState} state
 * @returns {boolean}
 */
const isEagerDerivedSchemaChain = (init, state) => {
  if (isLazySchemaCall(init, state)) {
    return false;
  }
  const { hasCall } = inspectZodChain(init);
  if (!hasCall) {
    return false;
  }
  const root = getChainRootIdentifier(init);
  return Boolean(root && state.schemaBindings.has(root.name));
};

/**
 * Adds declarator id name to schemaBindings when init is a Zod chain or a lazySchema call.
 * @param {VariableDeclarator} node
 * @param {FileState} state
 */
const recordSchemaBinding = (node, state) => {
  if (node.id.type !== esTypes.Identifier || !node.init) {
    return;
  }
  if (
    isLazySchemaCall(node.init, state) ||
    isZodNamespaceChain(node.init, state) ||
    isEagerDerivedSchemaChain(node.init, state)
  ) {
    state.schemaBindings.add(node.id.name);
  }
};

/**
 * VariableDeclaration parent is Program, or ExportNamedDeclaration whose parent is Program.
 * @param {VariableDeclarator} node
 * @param {Node[]} ancestors
 * @returns {boolean}
 */
const isModuleScopeDeclarator = (node, ancestors) => {
  const declaration = ancestors[ancestors.length - 1];
  if (
    !declaration ||
    declaration.type !== esTypes.VariableDeclaration ||
    declaration.kind !== 'const'
  ) {
    return false;
  }

  const parent = ancestors[ancestors.length - 2];
  if (!parent) {
    return false;
  }
  if (parent.type === esTypes.Program) {
    return true;
  }
  if (parent.type === esTypes.ExportNamedDeclaration) {
    const grandparent = ancestors[ancestors.length - 3];
    return grandparent?.type === esTypes.Program;
  }
  return false;
};

/**
 * @param {Node[]} ancestors
 * @param {FileState} state
 * @returns {boolean}
 */
const isModuleScopeProperty = (ancestors, state) => {
  const declaratorIndex = ancestors.findIndex(
    (ancestor) => ancestor.type === esTypes.VariableDeclarator
  );
  if (declaratorIndex < 0) {
    return false;
  }

  const declarator = /** @type {VariableDeclarator} */ (ancestors[declaratorIndex]);
  if (!isModuleScopeDeclarator(declarator, ancestors.slice(0, declaratorIndex))) {
    return false;
  }

  return !ancestors.slice(declaratorIndex + 1).some((ancestor) => {
    if (
      ancestor.type === esTypes.ArrowFunctionExpression ||
      ancestor.type === esTypes.FunctionExpression
    ) {
      return true;
    }
    if (ancestor.type !== esTypes.CallExpression) {
      return false;
    }
    const call = /** @type {Expression} */ (ancestor);
    return isZodNamespaceChain(call, state) || isEagerDerivedSchemaChain(call, state);
  });
};

/**
 * @param {Expression} node
 * @returns {boolean}
 */
const canAutoFixSchemaCall = (node) => {
  if (node.type !== esTypes.CallExpression || node.callee.type !== esTypes.MemberExpression) {
    return false;
  }
  const { callee } = node;
  return (
    !callee.computed &&
    callee.property.type === esTypes.Identifier &&
    AUTO_FIX_SCHEMA_METHODS.has(callee.property.name)
  );
};

/**
 * @param {Expression} node
 * @param {FileState} state
 * @returns {{ node: ImportDeclaration; namespace: boolean; name: string } | null}
 */
const getZodImportForSchema = (node, state) => {
  const root = getChainRootIdentifier(node);
  if (!root) {
    return null;
  }
  const directImport = state.zodImports.get(root.name);
  if (directImport) {
    return directImport;
  }
  if (state.zodNamespaces.has(root.name) || !state.schemaBindings.has(root.name)) {
    return null;
  }
  const imports = [...state.zodImports.values()];
  return imports.length === 1 ? imports[0] : null;
};

/**
 * @param {Node} node
 * @param {string} name
 * @param {import('eslint').SourceCode} sourceCode
 * @returns {boolean}
 */
const hasBinding = (node, name, sourceCode) => {
  let scope = sourceCode.getScope(node);
  while (scope) {
    if (scope.set.has(name)) {
      return true;
    }
    scope = scope.upper;
  }
  return false;
};

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'Require module-scope Zod schemas to be wrapped in lazySchema so they are not materialized at import.',
    },
    schema: [],
    messages: {
      eagerZodSchema:
        'Wrap this module-level Zod schema in `lazySchema(() => ...)` to defer its creation until first use.',
      eagerDerivedZodSchema:
        'Wrap this module-level Zod schema derivation in `lazySchema(() => ...)` to defer it until first use.',
    },
  },

  createOnce(context) {
    /** @type {FileState} */
    let state;
    let sourceCode;

    const reportEagerSchema = (node, messageId) => {
      let lazySchemaName =
        state.lazySchemaNames.size === 1 ? state.lazySchemaNames.values().next().value : undefined;
      let importToUpdate;
      if (!lazySchemaName && state.lazySchemaNames.size === 0) {
        const zodImport = getZodImportForSchema(node, state);
        if (zodImport?.namespace) {
          lazySchemaName = `${zodImport.name}.lazySchema`;
        } else if (zodImport && !hasBinding(node, 'lazySchema', sourceCode)) {
          lazySchemaName = 'lazySchema';
          importToUpdate = zodImport.node;
        }
      }
      const addImport = importToUpdate && !state.importFixScheduled;
      if (addImport && canAutoFixSchemaCall(node)) {
        state.importFixScheduled = true;
      }
      context.report({
        node,
        messageId,
        ...(lazySchemaName && canAutoFixSchemaCall(node)
          ? {
              fix: (fixer) => {
                const fixes = [
                  fixer.replaceText(node, `${lazySchemaName}(() => ${sourceCode.getText(node)})`),
                ];
                if (addImport) {
                  const namedImports = importToUpdate.specifiers.filter(
                    (specifier) => specifier.type === esTypes.ImportSpecifier
                  );
                  const lastSpecifier = namedImports[namedImports.length - 1];
                  fixes.unshift(fixer.insertTextAfter(lastSpecifier, ', lazySchema'));
                }
                return fixes;
              },
            }
          : {}),
      });
    };

    return {
      before() {
        state = {
          zodNamespaces: new Set(),
          lazySchemaNames: new Set(),
          zodImports: new Map(),
          importFixScheduled: false,
          schemaBindings: new Set(),
        };
        sourceCode = context.sourceCode;
      },
      ImportDeclaration(node) {
        recordImportBindings(/** @type {ImportDeclaration} */ (node), state);
      },
      VariableDeclarator(node) {
        const declarator = /** @type {VariableDeclarator} */ (node);
        if (!declarator.init) {
          return;
        }
        const ancestors = sourceCode.getAncestors(node);
        if (!isModuleScopeDeclarator(declarator, ancestors)) {
          return;
        }

        if (isLazySchemaCall(declarator.init, state)) {
          recordSchemaBinding(declarator, state);
          return;
        }

        if (isEagerZodNamespaceChain(declarator.init, state)) {
          reportEagerSchema(declarator.init, 'eagerZodSchema');
        } else if (isEagerDerivedSchemaChain(declarator.init, state)) {
          reportEagerSchema(declarator.init, 'eagerDerivedZodSchema');
        }

        recordSchemaBinding(declarator, state);
      },
      Property(node) {
        const property = /** @type {Property} */ (node);
        if (!isModuleScopeProperty(sourceCode.getAncestors(node), state)) {
          return;
        }

        const value = /** @type {Expression} */ (property.value);
        if (isEagerZodNamespaceChain(value, state)) {
          reportEagerSchema(value, 'eagerZodSchema');
        } else if (isEagerDerivedSchemaChain(value, state)) {
          reportEagerSchema(value, 'eagerDerivedZodSchema');
        }
      },
    };
  },
};
