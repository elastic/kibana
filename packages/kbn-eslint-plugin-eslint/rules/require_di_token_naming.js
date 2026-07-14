/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const CONVENTION_PATTERN = /^[a-z][a-zA-Z0-9]*\.[A-Z][a-zA-Z0-9]*$/;
const LOCAL_NAME_PATTERN = /^[A-Z][a-zA-Z0-9]*$/;
const PLUGIN_ID_PATTERN = /^[a-z][a-zA-Z0-9]*$/;

const CORE_TOKENS = new Set([
  'Global',
  'Setup',
  'Start',
  'OnSetup',
  'OnStart',
  'Scope',
  'Fork',
  'ProvidedService',
  'HostedExtensionPoint',
  'ContributedExtensionPoint',
]);

const PLATFORM_PREFIX_PATTERN = /^plugin\.(setup|start)\./;
const PLUGIN_DI_PACKAGE_NAME = '@kbn/plugin-di';
const SCOPED_TOKEN_METHODS = new Set(['service', 'extensionPoint']);

/**
 * @param {string} value
 * @returns {boolean}
 */
const isAllowedToken = (value) =>
  CORE_TOKENS.has(value) || PLATFORM_PREFIX_PATTERN.test(value) || CONVENTION_PATTERN.test(value);

/**
 * @param {import('@typescript-eslint/types').TSESTree.ImportDeclaration} node
 * @param {Set<string>} directImports
 * @param {Set<string>} namespaceImports
 */
const collectTokenFactoryImports = (node, directImports, namespaceImports) => {
  if (
    node.source.type !== 'Literal' ||
    typeof node.source.value !== 'string' ||
    node.source.value !== PLUGIN_DI_PACKAGE_NAME
  ) {
    return;
  }

  for (const specifier of node.specifiers) {
    if (
      specifier.type === 'ImportSpecifier' &&
      specifier.imported.type === 'Identifier' &&
      specifier.imported.name === 'createTokenFactory'
    ) {
      directImports.add(specifier.local.name);
    }

    if (specifier.type === 'ImportNamespaceSpecifier') {
      namespaceImports.add(specifier.local.name);
    }
  }
};

/**
 * @param {import('@typescript-eslint/types').TSESTree.CallExpression} node
 * @param {Set<string>} directImports
 * @param {Set<string>} namespaceImports
 * @returns {string | undefined}
 */
const getTokenFactoryArgValue = (node, directImports, namespaceImports) => {
  const arg = node.arguments[0];
  if (!arg || arg.type !== 'Literal' || typeof arg.value !== 'string') {
    return;
  }

  if (node.callee.type === 'Identifier' && directImports.has(node.callee.name)) {
    return arg.value;
  }

  if (
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.object.type === 'Identifier' &&
    namespaceImports.has(node.callee.object.name) &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'createTokenFactory'
  ) {
    return arg.value;
  }
};

/**
 * @param {import('@typescript-eslint/types').TSESTree.CallExpression} node
 * @param {Map<string, string>} helperPluginIds
 * @param {Set<string>} directTokenFactoryImports
 * @param {Set<string>} namespaceTokenFactoryImports
 * @returns {{ pluginId: string, localName: string, pluginIdNode?: import('@typescript-eslint/types').TSESTree.Node } | undefined}
 */
const getScopedTokenCall = (
  node,
  helperPluginIds,
  directTokenFactoryImports,
  namespaceTokenFactoryImports
) => {
  const arg = node.arguments[0];
  if (!arg || arg.type !== 'Literal' || typeof arg.value !== 'string') {
    return;
  }

  if (
    node.callee.type !== 'MemberExpression' ||
    node.callee.computed ||
    node.callee.property.type !== 'Identifier' ||
    !SCOPED_TOKEN_METHODS.has(node.callee.property.name)
  ) {
    return;
  }

  if (node.callee.object.type === 'Identifier' && helperPluginIds.has(node.callee.object.name)) {
    return {
      localName: arg.value,
      pluginId: helperPluginIds.get(node.callee.object.name),
      pluginIdNode: undefined,
    };
  }

  if (node.callee.object.type !== 'CallExpression') {
    return;
  }

  const pluginId = getTokenFactoryArgValue(
    node.callee.object,
    directTokenFactoryImports,
    namespaceTokenFactoryImports
  );
  if (!pluginId) {
    return;
  }

  return {
    localName: arg.value,
    pluginId,
    pluginIdNode: node.callee.object.arguments[0],
  };
};

/** @typedef {import("eslint").Rule.RuleModule} Rule */

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce `<pluginId>.<ServiceName>` naming for cross-plugin DI tokens.',
      category: 'Best Practices',
      recommended: false,
    },
    schema: [],
    messages: {
      badTokenName:
        'DI token "{{value}}" should follow the <pluginId>.<ServiceName> convention (e.g. "myPlugin.MyService").',
      badLocalName:
        'createTokenFactory name "{{value}}" should use a local PascalCase name without dots (e.g. "MyService").',
      badPluginId:
        'createTokenFactory id "{{value}}" should use a camelCase plugin id (e.g. "myPlugin").',
    },
  },

  create(context) {
    const directTokenFactoryImports = new Set();
    const namespaceTokenFactoryImports = new Set();
    const helperPluginIds = new Map();

    return {
      ImportDeclaration(node) {
        collectTokenFactoryImports(node, directTokenFactoryImports, namespaceTokenFactoryImports);
      },

      VariableDeclarator(node) {
        if (node.id.type !== 'Identifier' || !node.init || node.init.type !== 'CallExpression') {
          return;
        }

        const pluginId = getTokenFactoryArgValue(
          node.init,
          directTokenFactoryImports,
          namespaceTokenFactoryImports
        );
        if (!pluginId) {
          return;
        }

        if (!PLUGIN_ID_PATTERN.test(pluginId)) {
          context.report({
            node: node.init.arguments[0],
            messageId: 'badPluginId',
            data: { value: pluginId },
          });
          return;
        }

        helperPluginIds.set(node.id.name, pluginId);
      },

      CallExpression(node) {
        const scopedTokenCall = getScopedTokenCall(
          node,
          helperPluginIds,
          directTokenFactoryImports,
          namespaceTokenFactoryImports
        );
        if (scopedTokenCall) {
          if (!PLUGIN_ID_PATTERN.test(scopedTokenCall.pluginId)) {
            context.report({
              node: scopedTokenCall.pluginIdNode ?? node.arguments[0],
              messageId: 'badPluginId',
              data: { value: scopedTokenCall.pluginId },
            });
            return;
          }

          if (!LOCAL_NAME_PATTERN.test(scopedTokenCall.localName)) {
            context.report({
              node: node.arguments[0],
              messageId: 'badLocalName',
              data: { value: scopedTokenCall.localName },
            });
          }
          return;
        }

        if (
          node.callee.type !== 'MemberExpression' ||
          node.callee.object.type !== 'Identifier' ||
          node.callee.object.name !== 'Symbol' ||
          node.callee.property.type !== 'Identifier' ||
          node.callee.property.name !== 'for'
        ) {
          return;
        }

        const arg = node.arguments[0];
        if (!arg || arg.type !== 'Literal' || typeof arg.value !== 'string') {
          return;
        }

        const { parent } = node;
        if (
          !parent ||
          parent.type !== 'TSAsExpression' ||
          parent.typeAnnotation.type !== 'TSTypeReference'
        ) {
          return;
        }

        const { typeName } = parent.typeAnnotation;
        const name = typeName.type === 'Identifier' ? typeName.name : undefined;
        if (name !== 'ServiceIdentifier') {
          return;
        }

        if (!isAllowedToken(arg.value)) {
          context.report({
            node: arg,
            messageId: 'badTokenName',
            data: { value: arg.value },
          });
        }
      },
    };
  },
};
