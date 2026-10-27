/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { assert, normalizeWhitespace, init, parseLicense } = require('../lib');

function isHashbang(text) {
  return text.trim().startsWith('#!') && !text.trim().includes('\n');
}

// Jest only reads pragmas from the first comment in a file; a docblock comment
// consisting solely of `@jest-*` pragmas may percede the license header.
function isJestPragma(comment) {
  const lines = comment.value
    .split('\n')
    .map((line) => line.replace(/^[\s*]*/, ''))
    .filter(Boolean);

  return comment.type === 'Block' && lines.length > 0 && lines.every((l) => l.startsWith('@jest-'));
}

function getLeadingPragmaEnd(sourceCode) {
  const text = sourceCode.getText();
  let end = 0;

  for (const comment of sourceCode.getAllComments()) {
    if (!isJestPragma(comment) || text.slice(end, comment.range[0]).trim()) {
      break;
    }
    end = comment.range[1];
  }

  return end;
}

module.exports = {
  meta: {
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          license: {
            type: 'string',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  createOnce: (context) => {
    return {
      Program(program) {
        const license = init(context, program, function () {
          const options = context.options[0] || {};
          const license = options.license;

          assert(!!license, '"license" option is required');

          const { hasBody, commentCount, nodeValue } = parseLicense(license);
          assert(!hasBody, '"license" option must only include a single comment');
          assert(commentCount === 1, '"license" option must only include a single comment');

          return {
            source: license,
            nodeValue,
          };
        });

        if (!license) {
          return;
        }

        const sourceCode = context.sourceCode;
        const comment = sourceCode
          .getAllComments()
          .find((node) => normalizeWhitespace(node.value) === license.nodeValue);

        const pragmaEnd = getLeadingPragmaEnd(sourceCode);
        // code sharing the pragma's line needs its own line, or a `//` license would comment it out
        const codeFollowsPragma = !/^(\r?\n|$)/.test(sourceCode.getText().slice(pragmaEnd));
        const insertLicense = (fixer) =>
          pragmaEnd
            ? fixer.insertTextAfterRange(
                [0, pragmaEnd],
                '\n\n' + license.source + (codeFollowsPragma ? '\n\n' : '')
              )
            : fixer.replaceTextRange([0, 0], license.source + '\n\n');

        // no licence comment
        if (!comment) {
          context.report({
            message: 'File must start with a license header',
            loc: {
              start: { line: 1, column: 0 },
              end: { line: 1, column: sourceCode.lines[0].length },
            },
            fix(fixer) {
              if (isHashbang(sourceCode.lines[0])) {
                return undefined;
              }

              return insertLicense(fixer);
            },
          });
          return;
        }

        // The license comment must come first; an exception is made for jest
        // pragma docblocks.
        const sourceBeforeNode = sourceCode
          .getText()
          .slice(pragmaEnd, sourceCode.getIndexFromLoc(comment.loc.start));
        if (pragmaEnd && !sourceBeforeNode.trim()) {
          return;
        }
        if (sourceBeforeNode.length && !isHashbang(sourceBeforeNode)) {
          context.report({
            node: comment,
            message: 'License header must be at the very beginning of the file',
            fix(fixer) {
              // replace leading whitespace if possible
              if (sourceBeforeNode.trim() === '') {
                return fixer.replaceTextRange([0, sourceBeforeNode.length], '');
              }

              // inject content at top and remove node from current location
              // if removing whitespace is not possible
              return [fixer.remove(comment), insertLicense(fixer)];
            },
          });
        }
      },
    };
  },
};
