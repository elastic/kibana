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
const changedLines = require('./require_lazy_zod_schema_changed_lines');
const esTypes = tsEstree.AST_NODE_TYPES;

const ZOD_SOURCES = new Set(['@kbn/zod', '@kbn/zod/v4', 'zod', 'zod/v4', 'zod/v3']);
const AUTO_FIX_SCHEMA_METHODS = new Set([
  'array',
  'any',
  'boolean',
  'default',
  'describe',
  'datetime',
  'discriminatedUnion',
  'enum',
  'extend',
  'int',
  'literal',
  'looseObject',
  'max',
  'meta',
  'min',
  'nullable',
  'number',
  'object',
  'omit',
  'optional',
  'pick',
  'record',
  'refine',
  'regex',
  'string',
  'strictObject',
  'superRefine',
  'tuple',
  'union',
  'url',
  'xor',
]);
const SCHEMA_VALUE_METHODS = new Set([
  'array',
  'default',
  'describe',
  'extend',
  'max',
  'min',
  'nullable',
  'omit',
  'optional',
  'parse',
  'pick',
  'refine',
  'safeParse',
  'superRefine',
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
 * Checks that an identifier resolves to an import binding recorded from a Zod module.
 * @param {Identifier} identifier
 * @param {import('eslint').SourceCode} sourceCode
 * @param {Set<string>} names
 * @returns {boolean}
 */
const resolvesToImportedName = (identifier, sourceCode, names) => {
  if (!names.has(identifier.name)) {
    return false;
  }
  let scope = sourceCode.getScope(identifier);
  while (scope) {
    const variable = scope.set.get(identifier.name);
    if (variable) {
      return variable.defs.some(
        (definition) => definition.type === 'ImportBinding' && names.has(identifier.name)
      );
    }
    scope = scope.upper;
  }
  return false;
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
 * True for a zero-argument `.meta()` call, which reads metadata instead of building a schema.
 * @param {Expression | undefined} node
 * @returns {boolean}
 */
const isMetaGetterCall = (node) => {
  const unwrapped = unwrapExpression(node);
  if (!unwrapped || unwrapped.type !== esTypes.CallExpression) {
    return false;
  }
  const callee = unwrapExpression(unwrapped.callee);
  return Boolean(
    callee &&
      callee.type === esTypes.MemberExpression &&
      !callee.computed &&
      callee.property.type === esTypes.Identifier &&
      callee.property.name === 'meta' &&
      unwrapped.arguments.length === 0
  );
};

/**
 * @typedef {{
 *   zodNamespaces: Set<string>;
 *   lazySchemaNames: Set<string>;
 *   zodImports: Map<string, { node: ImportDeclaration; namespace: boolean; name: string }>;
 *   importFixScheduled: boolean;
 *   schemaBindings: Set<string>;
 *   schemaFactoryBindings: Set<string>;
 * }} FileState
 */

/**
 * True when init is a Zod-namespace builder chain (`z.object`, `z.lazy`, ...).
 * @param {Expression} init
 * @param {FileState} state
 * @returns {boolean}
 */
const isZodNamespaceChain = (init, state, sourceCode) => {
  const { hasCall } = inspectZodChain(init);
  if (!hasCall || isMetaGetterCall(init)) {
    return false;
  }
  const root = getChainRootIdentifier(init);
  return Boolean(root && resolvesToImportedName(root, sourceCode, state.zodNamespaces));
};

/**
 * Root is a zod namespace and the first member is not `lazy`.
 * @param {Expression} init
 * @param {FileState} state
 * @returns {boolean}
 */
const isEagerZodNamespaceChain = (init, state, sourceCode) => {
  const { hasCall, firstMember } = inspectZodChain(init);
  if (
    !hasCall ||
    isMetaGetterCall(init) ||
    firstMember === 'lazy' ||
    firstMember === 'lazySchema'
  ) {
    return false;
  }
  const root = getChainRootIdentifier(init);
  return Boolean(root && resolvesToImportedName(root, sourceCode, state.zodNamespaces));
};

/**
 * True when init is `lazySchema(() => ...)` using a recorded lazySchema binding.
 * @param {Expression} init
 * @param {FileState} state
 * @returns {boolean}
 */
const isLazySchemaCall = (init, state, sourceCode) => {
  const unwrapped = unwrapExpression(init);
  if (!unwrapped || unwrapped.type !== esTypes.CallExpression) {
    return false;
  }
  const callee = unwrapExpression(unwrapped.callee);
  const namedHelper =
    callee?.type === esTypes.Identifier &&
    resolvesToImportedName(callee, sourceCode, state.lazySchemaNames);
  const namespaceHelper =
    callee?.type === esTypes.MemberExpression &&
    !callee.computed &&
    callee.object.type === esTypes.Identifier &&
    resolvesToImportedName(callee.object, sourceCode, state.zodNamespaces) &&
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
 * @param {Expression} node
 * @returns {boolean}
 */
const canAutoFixSchemaCall = (node) => {
  if (node.type !== esTypes.CallExpression || node.callee.type !== esTypes.MemberExpression) {
    return false;
  }
  const { callee } = node;
  return (
    !isMetaGetterCall(node) &&
    !callee.computed &&
    callee.property.type === esTypes.Identifier &&
    AUTO_FIX_SCHEMA_METHODS.has(callee.property.name)
  );
};

/**
 * True when a schema method is called on a lazySchema result at module scope.
 * @param {Expression} init
 * @param {FileState} state
 * @returns {boolean}
 */
const isLazySchemaDerivationChain = (init, state, sourceCode) => {
  let current = unwrapExpression(init);
  if (!current || !canAutoFixSchemaCall(current)) {
    return false;
  }

  while (current && canAutoFixSchemaCall(current)) {
    current = unwrapExpression(current.callee.object);
    if (current && isLazySchemaCall(current, state, sourceCode)) {
      return true;
    }
  }
  return false;
};

/**
 * Root identifier is in schemaBindings and the chain has at least one call.
 * @param {Expression} init
 * @param {FileState} state
 * @returns {boolean}
 */
const isEagerDerivedSchemaChain = (init, state, sourceCode) => {
  if (isLazySchemaCall(init, state, sourceCode)) {
    return false;
  }
  const { hasCall } = inspectZodChain(init);
  if (!hasCall || isMetaGetterCall(init)) {
    return false;
  }
  const root = getChainRootIdentifier(init);
  return Boolean(
    root &&
      !resolvesToImportedName(root, sourceCode, state.zodNamespaces) &&
      (state.schemaBindings.has(root.name) || state.schemaFactoryBindings.has(root.name))
  );
};

/**
 * Collects return statements of a function body, skipping nested functions.
 * @param {Node} body
 * @returns {Node[]}
 */
const collectReturnStatements = (body) => {
  const returns = [];
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') {
      return;
    }
    if (
      node.type === esTypes.ArrowFunctionExpression ||
      node.type === esTypes.FunctionExpression ||
      node.type === esTypes.FunctionDeclaration
    ) {
      return;
    }
    if (node.type === esTypes.ReturnStatement) {
      returns.push(node);
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'parent') {
        continue;
      }
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else if (value && typeof value === 'object') {
        visit(value);
      }
    }
  };
  body.body.forEach(visit);
  return returns;
};

/**
 * @param {Expression} init
 * @param {FileState} state
 * @returns {boolean}
 */
const isSchemaFactory = (init, state, sourceCode) => {
  if (init.type !== esTypes.ArrowFunctionExpression && init.type !== esTypes.FunctionExpression) {
    return false;
  }
  if (init.body.type !== esTypes.BlockStatement) {
    return (
      isEagerZodNamespaceChain(init.body, state, sourceCode) && canAutoFixSchemaCall(init.body)
    );
  }
  const returns = collectReturnStatements(init.body);
  const lastStatement = init.body.body[init.body.body.length - 1];
  return (
    lastStatement?.type === esTypes.ReturnStatement &&
    returns.every(
      (statement) =>
        statement.argument &&
        isEagerZodNamespaceChain(statement.argument, state, sourceCode) &&
        canAutoFixSchemaCall(statement.argument)
    )
  );
};

/**
 * @param {Expression} node
 * @param {FileState} state
 * @returns {boolean}
 */
const canAutoFixSchemaExpression = (node, state) =>
  canAutoFixSchemaCall(node) ||
  (node.type === esTypes.CallExpression &&
    node.callee.type === esTypes.Identifier &&
    state.schemaFactoryBindings.has(node.callee.name));

/**
 * Adds declarator id name to schemaBindings when init is a Zod chain or a lazySchema call.
 * @param {VariableDeclarator} node
 * @param {FileState} state
 */
const recordSchemaBinding = (node, state, sourceCode) => {
  if (node.id.type !== esTypes.Identifier || !node.init) {
    return;
  }
  if (
    isLazySchemaCall(node.init, state, sourceCode) ||
    isLazySchemaDerivationChain(node.init, state, sourceCode) ||
    isZodNamespaceChain(node.init, state, sourceCode) ||
    isEagerDerivedSchemaChain(node.init, state, sourceCode)
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
 * A lazySchema proxy rejects writes, so a schema augmented after creation cannot be wrapped.
 * @param {VariableDeclarator} node
 * @param {import('eslint').SourceCode} sourceCode
 * @returns {boolean}
 */
const isSchemaAugmented = (node, sourceCode) => {
  if (node.id.type !== esTypes.Identifier) {
    return false;
  }
  const binding = sourceCode.getScope(node).set.get(node.id.name);
  return Boolean(
    binding?.references.some(({ identifier }) => {
      const call = identifier.parent;
      if (call?.type !== esTypes.CallExpression || call.arguments[0] !== identifier) {
        return false;
      }
      const callee = unwrapExpression(call.callee);
      if (
        callee?.type !== esTypes.MemberExpression ||
        callee.computed ||
        callee.object.type !== esTypes.Identifier ||
        callee.property.type !== esTypes.Identifier
      ) {
        return false;
      }
      const method = callee.property.name;
      return (
        (callee.object.name === 'Object' &&
          (method === 'defineProperty' || method === 'defineProperties' || method === 'assign')) ||
        (callee.object.name === 'Reflect' && method === 'defineProperty')
      );
    })
  );
};

/**
 * @param {Node[]} ancestors
 * @param {FileState} state
 * @returns {boolean}
 */
const isModuleScopeProperty = (ancestors, state, sourceCode) => {
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
    return (
      isZodNamespaceChain(call, state, sourceCode) ||
      isEagerDerivedSchemaChain(call, state, sourceCode)
    );
  });
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
  if (
    state.zodNamespaces.has(root.name) ||
    (!state.schemaBindings.has(root.name) && !state.schemaFactoryBindings.has(root.name))
  ) {
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

/**
 * @param {Expression} node
 * @returns {boolean}
 */
const containsAwaitExpression = (node) => {
  let hasAwait = false;
  tsEstree.simpleTraverse(node, {
    visitors: {
      [esTypes.AwaitExpression]: () => {
        hasAwait = true;
      },
    },
  });
  return hasAwait;
};

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'Require new or edited module-scope Zod schemas to be wrapped in lazySchema.',
    },
    schema: [],
    messages: {
      eagerZodSchema:
        'Wrap this module-level Zod schema in `lazySchema(() => ...)` to defer its creation until first use.',
      eagerDerivedZodSchema:
        'Wrap this module-level Zod schema derivation in `lazySchema(() => ...)` to defer it until first use.',
      schemaFactoryUsedAsSchema:
        'This function is used as a Zod schema. Use `lazySchema(() => ...)` to keep a schema value.',
    },
  },

  createOnce(context) {
    /** @type {FileState} */
    let state;
    let sourceCode;
    let fileChangedLines;
    /** @type {VariableDeclarator[]} */
    let schemaFactoryCandidates;

    const reportEagerSchema = (
      node,
      declaration,
      messageId,
      fixTarget = node,
      allowFix = true,
      unchangedDeclaration = declaration
    ) => {
      if (
        !changedLines.touchesChangedLine(fileChangedLines, declaration) ||
        changedLines.isUnchangedInAddedFile(
          context.filename,
          sourceCode.getText(unchangedDeclaration)
        )
      ) {
        return;
      }
      const canFix =
        allowFix && canAutoFixSchemaExpression(node, state) && !containsAwaitExpression(node);
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
      if (addImport && canFix) {
        state.importFixScheduled = true;
      }
      context.report({
        node,
        messageId,
        ...(lazySchemaName && canFix
          ? {
              fix: (fixer) => {
                const fixes = [
                  fixer.replaceText(
                    fixTarget,
                    `${lazySchemaName}(() => ${sourceCode.getText(node)})`
                  ),
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
          schemaFactoryBindings: new Set(),
        };
        sourceCode = context.sourceCode;
        fileChangedLines = changedLines.getChangedLines(context.filename, sourceCode.text);
        schemaFactoryCandidates = [];
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

        if (isSchemaAugmented(declarator, sourceCode)) {
          recordSchemaBinding(declarator, state, sourceCode);
          return;
        }

        if (isLazySchemaCall(declarator.init, state, sourceCode)) {
          recordSchemaBinding(declarator, state, sourceCode);
          return;
        }

        if (
          declarator.id.type === esTypes.Identifier &&
          isSchemaFactory(declarator.init, state, sourceCode)
        ) {
          state.schemaFactoryBindings.add(declarator.id.name);
        }

        if (
          declarator.id.type === esTypes.Identifier &&
          declarator.init.type === esTypes.ArrowFunctionExpression &&
          declarator.init.params.length === 0 &&
          !declarator.init.async &&
          declarator.init.body.type !== esTypes.BlockStatement &&
          state.schemaFactoryBindings.has(declarator.id.name)
        ) {
          schemaFactoryCandidates.push(declarator);
          return;
        }

        if (isEagerZodNamespaceChain(declarator.init, state, sourceCode)) {
          reportEagerSchema(declarator.init, declarator, 'eagerZodSchema');
        } else if (
          isEagerDerivedSchemaChain(declarator.init, state, sourceCode) ||
          isLazySchemaDerivationChain(declarator.init, state, sourceCode)
        ) {
          reportEagerSchema(declarator.init, declarator, 'eagerDerivedZodSchema');
        }

        recordSchemaBinding(declarator, state, sourceCode);
      },
      Property(node) {
        const property = /** @type {Property} */ (node);
        const ancestors = sourceCode.getAncestors(node);
        if (!isModuleScopeProperty(ancestors, state, sourceCode)) {
          return;
        }

        const value = /** @type {Expression} */ (property.value);
        const topLevelDeclarator = ancestors.find(
          (ancestor) => ancestor.type === esTypes.VariableDeclarator
        );
        const unchangedDeclaration = topLevelDeclarator || property;
        if (isEagerZodNamespaceChain(value, state, sourceCode)) {
          reportEagerSchema(value, property, 'eagerZodSchema', value, true, unchangedDeclaration);
        } else if (
          isEagerDerivedSchemaChain(value, state, sourceCode) ||
          isLazySchemaDerivationChain(value, state, sourceCode)
        ) {
          reportEagerSchema(
            value,
            property,
            'eagerDerivedZodSchema',
            value,
            true,
            unchangedDeclaration
          );
        }
      },
      'Program:exit'() {
        for (const declarator of schemaFactoryCandidates) {
          const binding = sourceCode.getScope(declarator).set.get(declarator.id.name);
          if (!binding) {
            continue;
          }

          let usedAsSchema = false;
          let calledAsFunction = false;
          for (const { identifier } of binding.references) {
            const parent = identifier.parent;
            if (
              parent?.type === esTypes.MemberExpression &&
              parent.object === identifier &&
              !parent.computed &&
              parent.property.type === esTypes.Identifier &&
              SCHEMA_VALUE_METHODS.has(parent.property.name)
            ) {
              usedAsSchema = true;
            } else if (parent?.type === esTypes.CallExpression && parent.callee === identifier) {
              calledAsFunction = true;
            }
          }
          if (!usedAsSchema) {
            continue;
          }

          const ancestors = sourceCode.getAncestors(declarator);
          const exported = ancestors[ancestors.length - 2]?.type === esTypes.ExportNamedDeclaration;
          reportEagerSchema(
            declarator.init.body,
            declarator,
            'schemaFactoryUsedAsSchema',
            declarator.init,
            !calledAsFunction && !exported
          );
        }
      },
    };
  },
};
