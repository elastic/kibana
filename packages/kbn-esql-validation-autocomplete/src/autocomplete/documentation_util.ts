/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

const declarationLabel = i18n.translate(
  'kbn-esql-validation-autocomplete.esql.autocomplete.declarationLabel',
  {
    defaultMessage: 'Declaration:',
  }
);

const examplesLabel = i18n.translate(
  'kbn-esql-validation-autocomplete.esql.autocomplete.examplesLabel',
  {
    defaultMessage: 'Examples:',
  }
);

/** @internal */
export const buildFunctionDocumentation = (
  signatures: Array<{
    declaration: string;
  }>,
  examples: string[] | undefined
) => `
---
\
***${declarationLabel}***
${signatures
  .map(
    ({ declaration }) => `
\
  - \`\`${declaration}\`\`
\
`
  )
  .join('\n\n')}
  ${
    examples?.length
      ? `\
---
***${examplesLabel}***
\
  ${examples
    .map(
      (i) => `
  - \`\`${i}\`\`
`
    )
    .join('')}
  
`
      : ''
  }`;

/** @internal **/
export const buildDocumentation = (declaration: string, examples?: string[]) => `
---
\
***${declarationLabel}***
\
  - \`\`${declaration}\`\`
\
---
${
  examples
    ? `\
***${examplesLabel}***
\
${examples.map(
  (i) => `
  - \`\`${i}\`\`
`
)}`
    : ''
}`;
