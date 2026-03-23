/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

const declarationLabel = i18n.translate('kbn-esql-language.esql.autocomplete.declarationLabel', {
  defaultMessage: 'Declaration:',
});

const examplesLabel = i18n.translate('kbn-esql-language.esql.autocomplete.examplesLabel', {
  defaultMessage: 'Examples:',
});

const MAX_LINE_LENGTH = 30;

/**
 * Splits a token that exceeds maxLen at delimiter characters
 * (e.g. `|`, `,`) so it can fit within the available width.
 */
function splitLongToken(token: string, maxLen: number): string[] {
  if (token.length <= maxLen) {
    return [token];
  }

  const parts: string[] = [];
  let current = '';

  for (let i = 0; i < token.length; i++) {
    current += token[i];
    const isDelimiter = token[i] === '|' || token[i] === ',';
    if (isDelimiter && current.length >= maxLen / 2 && i < token.length - 1) {
      parts.push(current);
      current = '';
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts.length > 1 ? parts : [token];
}

/**
 * Wraps lines that exceed MAX_LINE_LENGTH at word boundaries,
 * indenting continuation lines with two spaces.
 * Tokens without spaces that are still too long are further
 * split at delimiter characters like `|` and `,`.
 */
/** @internal exported for testing */
export function wrapLines(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      if (line.length <= MAX_LINE_LENGTH) {
        return line;
      }

      const words = line.split(' ');
      const lines: string[] = [];
      let current = '';

      for (const rawWord of words) {
        const tokens =
          rawWord.length > MAX_LINE_LENGTH ? splitLongToken(rawWord, MAX_LINE_LENGTH) : [rawWord];

        for (const word of tokens) {
          const candidate = current ? `${current} ${word}` : word;
          if (candidate.length > MAX_LINE_LENGTH && current) {
            lines.push(current);
            current = `  ${word}`;
          } else {
            current = candidate;
          }
        }
      }

      if (current) {
        lines.push(current);
      }

      return lines.join('\n');
    })
    .join('\n');
}

/** @internal */
export const buildFunctionDocumentation = (
  detail: string,
  signatures: Array<{
    declaration: string;
    license?: string;
  }>,
  examples: string[] | undefined
) => `
${detail}

# ${declarationLabel}
\`\`\`typescript
${wrapLines(
  signatures.map(({ declaration, license }) => `${declaration}${license || ''}`).join('\n')
)}
\`\`\`

${
  examples?.length
    ? `\
# ${examplesLabel}
\`\`\`esql
${wrapLines(examples.join('\n'))}
\`\`\`
`
    : ''
}`;

/** @internal **/
export const buildDocumentation = (detail: string, declaration: string, examples?: string[]) => `
${detail}

# ${declarationLabel}
\`\`\`esql
${wrapLines(declaration)}
\`\`\`

${
  examples?.length
    ? `\
# ${examplesLabel}
\`\`\`esql
${wrapLines(examples.map((ex) => ex.replace(/^…/gm, '...')).join('\n'))}
\`\`\`
`
    : ''
}`;
