/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { RuleTester } from 'eslint';
import { REPO_ROOT } from '@kbn/repo-info';
import { NoQuarantinedImportsRule } from './no_quarantined_imports';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
    ecmaFeatures: {
      jsx: true,
    },
  },
});

const disallowedFile = Path.join(REPO_ROOT, 'src/core/server/disallowed.ts');
const langchainFile = Path.join(
  REPO_ROOT,
  'x-pack/platform/packages/shared/kbn-langchain/server/language_models/chat_bedrock_converse/chat_bedrock_converse.ts'
);

ruleTester.run('@kbn/imports/no_quarantined_imports', NoQuarantinedImportsRule, {
  valid: [
    {
      filename: langchainFile,
      code: `import { ChatBedrockConverse } from '@langchain/aws';`,
    },
    {
      filename: disallowedFile,
      code: `import lodash from 'lodash';`,
    },
    {
      filename: Path.join(
        REPO_ROOT,
        'x-pack/solutions/security/plugins/elastic_assistant/server/foo.ts'
      ),
      code: `import { ActionsClientLlm } from '@kbn/langchain/server';`,
    },
  ],
  invalid: [
    {
      filename: disallowedFile,
      code: `import { ChatBedrockConverse } from '@langchain/aws';`,
      errors: [
        {
          message: /@langchain\/aws[\s\S]*kbn-dependency-quarantine\/configs[\s\S]*kibana-security/,
        },
      ],
    },
    {
      filename: disallowedFile,
      code: `import { ChatBedrockConverse } from '@langchain/aws/client';`,
      errors: [{ message: /@langchain\/aws/ }],
    },
    {
      filename: disallowedFile,
      code: `import type { ChatBedrockConverse } from '@langchain/aws';`,
      errors: [{ message: /@langchain\/aws/ }],
    },
    {
      filename: disallowedFile,
      code: `const aws = require('@langchain/aws');`,
      errors: [{ message: /@langchain\/aws/ }],
    },
    {
      filename: disallowedFile,
      code: `jest.mock('@langchain/aws');`,
      errors: [{ message: /@langchain\/aws/ }],
    },
    {
      filename: disallowedFile,
      code: `import { ActionsClientLlm } from '@kbn/langchain/server';`,
      errors: [{ message: /@kbn\/langchain/ }],
    },
  ],
});
