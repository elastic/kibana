/* eslint-disable @kbn/eslint/require-license-header */
/* eslint-disable @typescript-eslint/no-shadow */

// pulled from https://github.com/nrwl/nx/blob/e12922b02908c90797e038324f2afa4bf69e2eab/packages/nx/src/utils/strip-source-code.ts#L4

/**
 * @notice
 *
 * This project includes code from the NX project, which is MIT licensed:
 *
 * (The MIT License)
 *
 * Copyright (c) 2017-2022 Narwhal Technologies Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { SyntaxKind } from 'typescript';
import type { Scanner } from 'typescript';

const TYPE_IMPORT_COMMENT_RE = /\{(.*import.*\(.*["'].*)\}/g;

export function stripSourceCode(scanner: Scanner, contents: string): string {
  scanner.setText(contents);
  let token = scanner.scan();
  const statements: string[] = [];
  let start = null;
  while (token !== SyntaxKind.EndOfFileToken) {
    const potentialStart = scanner.getStartPos();
    switch (token) {
      case SyntaxKind.MultiLineCommentTrivia:
      case SyntaxKind.SingleLineCommentTrivia: {
        const isMultiline = token === SyntaxKind.MultiLineCommentTrivia;
        const start = potentialStart;
        token = scanner.scan();
        if (!isMultiline) {
          break;
        }

        const end = scanner.getStartPos();
        const comment = contents.substring(start, end);
        // preserve multi-line comments which import types
        for (const match of comment.matchAll(TYPE_IMPORT_COMMENT_RE)) {
          statements.push(match[1]);
        }
        break;
      }

      case SyntaxKind.RequireKeyword:
      case SyntaxKind.ImportKeyword: {
        token = scanner.scan();
        while (token === SyntaxKind.WhitespaceTrivia || token === SyntaxKind.NewLineTrivia) {
          token = scanner.scan();
        }
        start = potentialStart;
        break;
      }

      case SyntaxKind.ExportKeyword: {
        token = scanner.scan();
        while (token === SyntaxKind.WhitespaceTrivia || token === SyntaxKind.NewLineTrivia) {
          token = scanner.scan();
        }
        if (
          token === SyntaxKind.OpenBraceToken ||
          token === SyntaxKind.AsteriskToken ||
          token === SyntaxKind.TypeKeyword
        ) {
          start = potentialStart;
        }
        break;
      }

      case SyntaxKind.TemplateHead:
      case SyntaxKind.TemplateMiddle: {
        while (true) {
          token = scanner.scan();

          if (token === SyntaxKind.SlashToken) {
            token = scanner.reScanSlashToken();
          }

          if (token === SyntaxKind.EndOfFileToken) {
            // either the template is unterminated, or there
            // is some other edge case we haven't compensated for
            break;
          }

          if (token === SyntaxKind.CloseBraceToken) {
            token = scanner.reScanTemplateToken(false);
            break;
          }
        }
        break;
      }

      case SyntaxKind.StringLiteral: {
        if (start !== null) {
          token = scanner.scan();
          if (token === SyntaxKind.CloseParenToken) {
            token = scanner.scan();
          }
          const end = scanner.getStartPos();
          statements.push(contents.substring(start, end));
          start = null;
        } else {
          token = scanner.scan();
        }
        break;
      }

      default: {
        token = scanner.scan();
      }
    }
  }

  return statements.join('\n');
}
