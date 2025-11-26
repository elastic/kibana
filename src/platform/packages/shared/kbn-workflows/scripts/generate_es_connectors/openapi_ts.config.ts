/* eslint-disable @kbn/eslint/require-license-header */
/* eslint-disable import/no-default-export */

import type { UserConfig } from '@hey-api/openapi-ts';
import fs from 'fs';
import type { OpenAPIV3 } from 'openapi-types';
import {
  ES_SPEC_OPENAPI_PATH,
  OPENAPI_TS_OUTPUT_FILENAME,
  OPENAPI_TS_OUTPUT_FOLDER_PATH,
} from './constants';
import { allowShortQuerySyntax } from '../shared/oas_allow_short_query_syntax';
import { removeDiscriminatorsWithoutMapping } from '../shared/oas_remove_discriminators_without_mapping';

const openApiSpec = JSON.parse(fs.readFileSync(ES_SPEC_OPENAPI_PATH, 'utf8')) as OpenAPIV3.Document;
const preprocessedOpenApiSpec = [removeDiscriminatorsWithoutMapping, allowShortQuerySyntax].reduce(
  (acc, fn) => fn(acc),
  openApiSpec
);

const config: UserConfig = {
  // @ts-expect-error - for some reason openapi-ts doesn't accept OpenAPIV3.Document
  input: preprocessedOpenApiSpec,
  output: {
    path: OPENAPI_TS_OUTPUT_FOLDER_PATH,
    fileName: OPENAPI_TS_OUTPUT_FILENAME,
  },
  plugins: [
    {
      name: 'zod',
      case: 'snake_case',
      requests: {
        name: '{{name}}_request',
      },
      responses: {
        name: '{{name}}_response',
      },
      definitions: {
        name: '{{name}}',
      },
      metadata: true,
      compatibilityVersion: 4,
    },
  ],
};

export default config;
