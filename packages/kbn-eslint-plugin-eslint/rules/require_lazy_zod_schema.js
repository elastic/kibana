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

const tsEstree = require('@typescript-eslint/typescript-estree');
const esTypes = tsEstree.AST_NODE_TYPES;

const ZOD_SOURCES = new Set(['@kbn/zod', '@kbn/zod/v4', 'zod', 'zod/v4', 'zod/v3']);

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
 * @param {{ zodNamespaces: Set<string>; lazySchemaNames: Set<string> }} state
 */
const recordImportBindings = (node, state) => {
  if (node.importKind === 'type' || !node.source || typeof node.source.value !== 'string') {
    return;
  }
  if (!isZodModuleSource(node.source.value)) {
    return;
  }

  for (const spec of node.specifiers) {
    if (spec.importKind === 'type' || !spec.local?.name) {
      continue;
    }

    if (
      spec.type === esTypes.ImportDefaultSpecifier ||
      spec.type === esTypes.ImportNamespaceSpecifier
    ) {
      state.zodNamespaces.add(spec.local.name);
      continue;
    }

    if (spec.type === esTypes.ImportSpecifier) {
      const importedName = getImportedName(spec.imported);
      if (importedName === 'z') {
        state.zodNamespaces.add(spec.local.name);
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
 * Root is a zod namespace and the first member is not `lazy`.
 * @param {Expression} init
 * @param {{ zodNamespaces: Set<string> }} state
 * @returns {boolean}
 */
const isEagerZodNamespaceChain = (init, state) => {
  const { hasCall, firstMember } = inspectZodChain(init);
  if (!hasCall || firstMember === 'lazy') {
    return false;
  }
  const root = getChainRootIdentifier(init);
  return Boolean(root && state.zodNamespaces.has(root.name));
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

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require module-scope Zod schemas to be wrapped in lazySchema so they are not materialized at import.',
    },
    schema: [],
    messages: {
      eagerZodSchema:
        'Wrap module-scope Zod schemas in `lazySchema(() => ...)` so they are not materialized at import. See https://github.com/elastic/kibana/pull/294667.',
    },
  },

  createOnce(context) {
    /** @type {Set<string>} */
    let zodNamespaces;
    /** @type {Set<string>} */
    let lazySchemaNames;
    let sourceCode;

    return {
      before() {
        zodNamespaces = new Set();
        lazySchemaNames = new Set();
        sourceCode = context.sourceCode;
      },
      ImportDeclaration(node) {
        recordImportBindings(/** @type {ImportDeclaration} */ (node), {
          zodNamespaces,
          lazySchemaNames,
        });
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
        if (isEagerZodNamespaceChain(declarator.init, { zodNamespaces })) {
          context.report({ node: declarator.init, messageId: 'eagerZodSchema' });
        }
      },
    };
  },
};
