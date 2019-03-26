/* eslint-disable-line @kbn/eslint/require-license-header */
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
const mm = require('micromatch');

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

function resolveBasePath(basePath) {
  return path.isAbsolute(basePath) ? basePath : path.relative(process.cwd(), basePath);
}

function traverseToTopFolder(src, pattern) {
  while (mm([src], pattern).length > 0) {
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
                target: {
                  anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
                },
                from: {
                  anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
                },
                allowSameFolder: { type: 'boolean' },
              },
              additionalProperties: false,
            },
          },
          basePath: { type: 'string' },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = context.options[0] || {};
    const zones = options.zones || [];
    const basePath = options.basePath ? resolveBasePath(options.basePath) : process.cwd();

    function checkForRestrictedImportPath(importPath, node) {
      const absoluteImportPath = resolve(importPath, context);
      if (!absoluteImportPath) return;

      const currentFilename = context.getFilename();
      for (const { target, from, allowSameFolder } of zones) {
        const srcFilePath = resolve(currentFilename, context);

        const relativeSrcFile = path.relative(basePath, srcFilePath);
        const relativeImportFile = path.relative(basePath, absoluteImportPath);

        if (
          !mm([relativeSrcFile], target).length ||
          !mm([relativeImportFile], from).length ||
          (allowSameFolder && isSameFolderOrDescendent(relativeSrcFile, relativeImportFile, from))
        )
          continue;

        context.report({
          node,
          message: `Unexpected path "${importPath}" imported in restricted zone.`,
        });
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
