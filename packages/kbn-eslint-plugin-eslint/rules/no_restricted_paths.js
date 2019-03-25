/* eslint-disable @kbn/eslint/require-license-header */
/* @notice
 * This product uses import/no-restricted-paths which is available under a
 * "MIT" license.
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-present, Ben Mosher
 * https://github.com/benmosher/eslint-plugin-import
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
const path = require('path');
const resolve = require('eslint-module-utils/resolve').default;
const containsPath = require('contains-path');

function toArray(value) {
  return Array.isArray(value) ? value : [value];
}

function isStaticRequire(node) {
  return (
    node &&
    node.callee &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require' &&
    node.arguments.length === 1 &&
    node.arguments[0].type === 'Literal' &&
    typeof node.arguments[0].value === 'string'
  );
}

function traverseToTopFolder(src, pattern) {
  while (containsPath(src, pattern)) {
    const srcIdx = src.lastIndexOf(path.sep);
    src = src.slice(0, srcIdx);
  }
  return src;
}

function isSameFolderOrDescendent(src, imported, pattern) {
  const srcFileFolderRoot = traverseToTopFolder(src, pattern);
  const importedFileFolderRoot = traverseToTopFolder(imported, pattern);
  return srcFileFolderRoot === importedFileFolderRoot;
}

module.exports = {
  /**
   *@type {import('eslint').Rule}
   */
  meta: {
    schema: [
      {
        type: 'object',
        properties: {
          zones: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                target: { type: 'string' },
                from: {
                  anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
                },
                allowSameFolder: { type: 'boolean' },
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },

  /**
   *@param {import('eslint').Rule.RuleContext} context runtime context
   *@returns {import('eslint').Rule.RuleListener}
   */
  create(context) {
    const options = context.options[0] || {};
    const zones = options.zones || [];
    const basePath = process.cwd();
    const currentFilename = context.getFilename();
    const matchingZones = zones.filter(zone => {
      const targetPath = path.resolve(basePath, zone.target);

      return containsPath(currentFilename, targetPath);
    });

    function checkForRestrictedImportPath(importPath, node) {
      const absoluteImportPath = resolve(importPath, context);

      if (!absoluteImportPath) return;
      for (const zone of matchingZones) {
        for (const from of toArray(zone.from)) {
          const absoluteFrom = path.resolve(basePath, from);

          if (!containsPath(absoluteImportPath, absoluteFrom)) continue;
          if (
            zone.allowSameFolder &&
            isSameFolderOrDescendent(
              resolve(currentFilename, context),
              absoluteImportPath,
              absoluteFrom
            )
          ) {
            continue;
          }

          context.report({
            node,
            message: `Unexpected path "${importPath}" imported in restricted zone.`,
          });
        }
      }
    }

    return {
      ImportDeclaration(node) {
        checkForRestrictedImportPath(node.source.value, node.source);
      },
      CallExpression(node) {
        if (isStaticRequire(node)) {
          const [firstArgument] = node.arguments;

          checkForRestrictedImportPath(firstArgument.value, firstArgument);
        }
      },
    };
  },
};
