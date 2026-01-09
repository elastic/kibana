/* eslint-disable @kbn/eslint/require-license-header */
/* eslint-disable import/no-default-export */

import type { UserConfig } from '@hey-api/openapi-ts';
import fs from 'fs';
import type { OpenAPIV3 } from 'openapi-types';
import yaml from 'yaml';
import {
  KIBANA_SPEC_OPENAPI_PATH,
  OPENAPI_TS_OUTPUT_FILENAME,
  OPENAPI_TS_OUTPUT_FOLDER_PATH,
} from './constants';
import { removeDiscriminatorsWithInvalidMapping } from '../shared/oas_remove_discriminators_with_invalid_mapping';
import { removeDiscriminatorsWithoutMapping } from '../shared/oas_remove_discriminators_without_mapping';

console.log('Reading OpenAPI spec from ', KIBANA_SPEC_OPENAPI_PATH);
const openApiSpec = yaml.parse(
  fs.readFileSync(KIBANA_SPEC_OPENAPI_PATH, 'utf8')
) as OpenAPIV3.Document;

console.log('Preprocessing OpenAPI spec...');
const preprocessedOpenApiSpec = [
  removeDiscriminatorsWithoutMapping,
  removeDiscriminatorsWithInvalidMapping,
].reduce((acc, fn) => fn(acc), openApiSpec);

function buildConfig({ include }: { include: string[] }): UserConfig {
  return {
    // @ts-expect-error - for some reason openapi-ts doesn't accept OpenAPIV3.Document
    input: preprocessedOpenApiSpec,
    output: {
      path: OPENAPI_TS_OUTPUT_FOLDER_PATH,
      fileName: OPENAPI_TS_OUTPUT_FILENAME,
    },
    parser: {
      filters: {
        operations: {
          include: include || [],
        },
      },
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
}

export default buildConfig;
