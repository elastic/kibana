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
${signatures.map(({ declaration, license }) => `${declaration}${license || ''}`).join('\n')}
\`\`\`

${
  examples?.length
    ? `\
# ${examplesLabel}
\`\`\`esql
${examples.join('\n')}
\`\`\`
`
    : ''
}`;

/** @internal **/
export const buildDocumentation = (detail: string, declaration: string, examples?: string[]) => `
${detail}

# ${declarationLabel}
\`\`\`esql
${declaration}
\`\`\`

${
  examples?.length
    ? `\
# ${examplesLabel}
\`\`\`esql
${examples.map((ex) => ex.replace(/^…/gm, '...')).join('\n')}
\`\`\`
`
    : ''
}`;
