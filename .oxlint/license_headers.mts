/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OxlintOverride } from 'oxlint';

const APACHE_2_0_LICENSE_HEADER = `
/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
`;

const TRIPLE_ELV2_SSPL1_AGPL3_LICENSE_HEADER = `
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
`;

const DUAL_ELV2_SSPL1_LICENSE_HEADER = `
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
`;

const DUAL_ELV1_SSPL1_LICENSE_HEADER = `
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
`;

const ELV2_LICENSE_HEADER = `
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
`;

const OLD_ELASTIC_LICENSE_HEADER = `
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
`;

const SAFER_LODASH_SET_HEADER = `
/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See \`src/platform/packages/shared/kbn-safer-lodash-set/LICENSE\` for more information.
 */
`;

const SAFER_LODASH_SET_LODASH_HEADER = `
/*
 * This file is forked from the lodash project (https://lodash.com/),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See \`src/platform/packages/shared/kbn-safer-lodash-set/LICENSE\` for more information.
 */
`;

const SAFER_LODASH_SET_DEFINITELYTYPED_HEADER = `
/*
 * This file is forked from the DefinitelyTyped project (https://github.com/DefinitelyTyped/DefinitelyTyped),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See \`src/platform/packages/shared/kbn-safer-lodash-set/LICENSE\` for more information.
 */
`;

const KBN_HANDLEBARS_HEADER = `
/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See \`src/platform/packages/private/kbn-handlebars/LICENSE\` for more information.
 */
`;

const KBN_HANDLEBARS_HANDLEBARS_HEADER = `
/*
  * This file is forked from the handlebars project (https://github.com/handlebars-lang/handlebars.js),
  * and may include modifications made by Elasticsearch B.V.
  * Elasticsearch B.V. licenses this file to you under the MIT License.
  * See \`src/platform/packages/private/kbn-handlebars/LICENSE\` for more information.
  */
`;

const VENN_DIAGRAM_HEADER = `
/*
  * This file is forked from the venn.js project (https://github.com/benfred/venn.js/),
  * and may include modifications made by Elasticsearch B.V.
  * Elasticsearch B.V. licenses this file to you under the MIT License.
  * See \`x-pack/platform/plugins/private/graph/public/components/venn_diagram/vennjs/LICENSE\` for more information.
  */
`;

const ALL_LICENSE_HEADERS = [
  APACHE_2_0_LICENSE_HEADER,
  TRIPLE_ELV2_SSPL1_AGPL3_LICENSE_HEADER,
  DUAL_ELV2_SSPL1_LICENSE_HEADER,
  DUAL_ELV1_SSPL1_LICENSE_HEADER,
  ELV2_LICENSE_HEADER,
  OLD_ELASTIC_LICENSE_HEADER,
  SAFER_LODASH_SET_HEADER,
  SAFER_LODASH_SET_LODASH_HEADER,
  SAFER_LODASH_SET_DEFINITELYTYPED_HEADER,
  KBN_HANDLEBARS_HEADER,
  KBN_HANDLEBARS_HANDLEBARS_HEADER,
  VENN_DIAGRAM_HEADER,
] as const;

/** Requires `license` on `files` and disallows every other known license header there. */
const requireLicenseHeader = (files: string[], license: string): OxlintOverride => ({
  files,
  rules: {
    '@kbn/eslint/require-license-header': ['error', { license }],
    '@kbn/eslint/disallow-license-headers': [
      'error',
      { licenses: ALL_LICENSE_HEADERS.filter((header) => header !== license) },
    ],
  },
});

/** Order matters: later overrides win for files matched by several globs. */
export const licenseHeaderOverrides: OxlintOverride[] = [
  requireLicenseHeader(['**/*.{js,mjs,ts,tsx}'], TRIPLE_ELV2_SSPL1_AGPL3_LICENSE_HEADER),
  requireLicenseHeader(
    [
      'packages/kbn-eslint-config/**/*.{js,mjs,ts,tsx}',
      'src/platform/packages/shared/kbn-datemath/**/*.{js,mjs,ts,tsx}',
    ],
    APACHE_2_0_LICENSE_HEADER
  ),
  requireLicenseHeader(['x-pack/**/*.{js,mjs,ts,tsx}'], ELV2_LICENSE_HEADER),
  requireLicenseHeader(
    ['src/platform/packages/shared/kbn-safer-lodash-set/**/*.{js,mjs,ts,tsx}'],
    SAFER_LODASH_SET_LODASH_HEADER
  ),
  requireLicenseHeader(
    ['src/platform/packages/shared/kbn-safer-lodash-set/test/*.{js,mjs,ts,tsx}'],
    SAFER_LODASH_SET_HEADER
  ),
  requireLicenseHeader(
    ['src/platform/packages/shared/kbn-safer-lodash-set/**/*.d.ts'],
    SAFER_LODASH_SET_DEFINITELYTYPED_HEADER
  ),
  requireLicenseHeader(
    ['src/platform/packages/private/kbn-handlebars/**/*.{js,mjs,ts,tsx}'],
    KBN_HANDLEBARS_HEADER
  ),
  requireLicenseHeader(
    ['src/platform/packages/private/kbn-handlebars/src/spec/**/*.{js,mjs,ts,tsx}'],
    KBN_HANDLEBARS_HANDLEBARS_HEADER
  ),
  requireLicenseHeader(
    [
      'x-pack/platform/plugins/private/graph/public/components/venn_diagram/vennjs/**/*.{js,mjs,ts,tsx}',
    ],
    VENN_DIAGRAM_HEADER
  ),
  {
    // ESLint skips hidden directories except those .eslintignore re-includes; keep the
    // license header rules off in the same set now that oxlint owns them.
    files: ['**/.*/**'],
    excludeFiles: ['**/.buildkite/**', '**/.github/**', '**/.storybook/**'],
    rules: {
      '@kbn/eslint/require-license-header': 'off',
      '@kbn/eslint/disallow-license-headers': 'off',
    },
  },
];
