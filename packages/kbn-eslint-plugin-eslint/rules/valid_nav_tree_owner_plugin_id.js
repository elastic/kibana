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

/** @typedef {import("eslint").Rule.RuleModule} Rule */

/**
 * The `ownerPluginId` passed to `addSolutionNavigation` / `initNavigation` is later trusted, at
 * runtime, to attribute a solution nav tree's cross-plugin references to a plugin (see
 * https://github.com/elastic/kibana/issues/66682). This rule statically guarantees that the value
 * matches the `plugin.id` of the plugin the call actually lives in, so the attribution cannot lie.
 */

const NAV_REGISTRATION_METHODS = new Set(['addSolutionNavigation', 'initNavigation']);

/** Cache of directory -> resolved `plugin.id` (or null) to avoid re-reading manifests. */
const pluginIdByDir = new Map();

/**
 * Walk up from a file to the nearest `kibana.jsonc` and extract its `plugin.id`.
 * @param {string} fromPath absolute path of the linted file
 * @returns {string | null}
 */
function resolvePluginId(fromPath) {
  let dir = Path.dirname(fromPath);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (pluginIdByDir.has(dir)) {
      return pluginIdByDir.get(dir);
    }

    const manifestPath = Path.join(dir, 'kibana.jsonc');
    if (Fs.existsSync(manifestPath)) {
      const pluginId = readPluginId(manifestPath);
      pluginIdByDir.set(dir, pluginId);
      return pluginId;
    }

    const parent = Path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

/**
 * Extract `plugin.id` from a `kibana.jsonc` manifest. Uses a tolerant regex rather than a JSONC
 * parser to keep the rule dependency-free.
 * @param {string} manifestPath
 * @returns {string | null}
 */
function readPluginId(manifestPath) {
  try {
    const contents = Fs.readFileSync(manifestPath, 'utf8');
    const match = contents.match(/"plugin"\s*:\s*\{[\s\S]*?"id"\s*:\s*"([^"]+)"/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

/**
 * Find the `ownerPluginId` string literal node for a nav-registration call, if present.
 * @param {any} node CallExpression
 * @param {string} methodName
 * @returns {any | null} the Literal node, or null when absent / not a static string
 */
function findOwnerPluginIdLiteral(node, methodName) {
  if (methodName === 'initNavigation') {
    const arg = node.arguments[2];
    return arg && arg.type === 'Literal' && typeof arg.value === 'string' ? arg : null;
  }

  // addSolutionNavigation({ ..., ownerPluginId: '...' })
  const [arg] = node.arguments;
  if (!arg || arg.type !== 'ObjectExpression') {
    return null;
  }
  const property = arg.properties.find(
    (prop) =>
      prop.type === 'Property' &&
      !prop.computed &&
      ((prop.key.type === 'Identifier' && prop.key.name === 'ownerPluginId') ||
        (prop.key.type === 'Literal' && prop.key.value === 'ownerPluginId'))
  );
  if (!property || property.value.type !== 'Literal' || typeof property.value.value !== 'string') {
    return null;
  }
  return property.value;
}

/** @type {Rule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Ensure the ownerPluginId passed to solution navigation registration matches the calling plugin's id.",
    },
    schema: [],
    messages: {
      mismatch:
        'ownerPluginId "{{ owner }}" does not match the plugin that registers this navigation ("{{ actual }}"). Pass the id of the plugin this file belongs to so cross-plugin navigation dependencies are attributed correctly.',
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        const { callee } = node;
        if (
          callee.type !== 'MemberExpression' ||
          callee.property.type !== 'Identifier' ||
          !NAV_REGISTRATION_METHODS.has(callee.property.name)
        ) {
          return;
        }

        const ownerLiteral = findOwnerPluginIdLiteral(node, callee.property.name);
        if (!ownerLiteral) {
          return;
        }

        const actualPluginId = resolvePluginId(context.getFilename());
        if (!actualPluginId || actualPluginId === ownerLiteral.value) {
          return;
        }

        context.report({
          node: ownerLiteral,
          messageId: 'mismatch',
          data: { owner: ownerLiteral.value, actual: actualPluginId },
        });
      },
    };
  },
};
