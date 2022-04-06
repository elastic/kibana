/* eslint-disable-line @kbn/eslint/require-license-header */
/*
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
const mm = require('micromatch');
const { resolveKibanaImport } = require('@kbn/eslint-plugin-imports');

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
  while (mm([src], pattern).length > 0) {
    const srcIdx = src.lastIndexOf(path.sep);
    src = src.slice(0, srcIdx);
  }
  return src;
}

function isSameFolderOrDescendent(src, imported, pattern) {
  // to allow to exclude file by name in pattern (e.g., !**/index*) we start with file dirname and then traverse
  const srcFileFolderRoot = traverseToTopFolder(path.dirname(src), pattern);
  const importedFileFolderRoot = traverseToTopFolder(path.dirname(imported), pattern);

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
                errorMessage: { type: 'string' },
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
    const sourcePath = context.getPhysicalFilename
      ? context.getPhysicalFilename()
      : context.getFilename();
    const sourceDirname = path.dirname(sourcePath);

    const options = context.options[0] || {};
    const zones = options.zones || [];
    const basePath = options.basePath;
    if (!basePath || !path.isAbsolute(basePath)) {
      throw new Error('basePath option must be specified and must be absolute');
    }

    function checkForRestrictedImportPath(importPath, node) {
      const resolveReport = resolveKibanaImport(importPath, sourceDirname);

      if (resolveReport?.type !== 'file' || resolveReport.nodeModule) {
        return;
      }

      for (const { target, from, allowSameFolder, errorMessage = '' } of zones) {
        const relativeSrcFile = path.relative(basePath, sourcePath);
        const relativeImportFile = path.relative(basePath, resolveReport.absolute);

        if (
          !mm([relativeSrcFile], target).length ||
          !mm([relativeImportFile], from).length ||
          (allowSameFolder && isSameFolderOrDescendent(relativeSrcFile, relativeImportFile, from))
        )
          continue;

        context.report({
          node,
          message: `Unexpected path "${importPath}" imported in restricted zone.${
            errorMessage ? ' ' + errorMessage : ''
          }`,
        });
      }
    }

    return {
      ExportNamedDeclaration(node) {
        if (!node.source) return;
        checkForRestrictedImportPath(node.source.value, node.source);
      },
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
