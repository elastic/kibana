/* eslint-disable @kbn/eslint/require-license-header */
/* eslint-disable import/no-default-export */

import type { UserConfig } from '@hey-api/openapi-ts';
import fs from 'fs';
import type { OpenAPIV3 } from 'openapi-types';
import {
  ES_SPEC_OPENAPI_PATH,
  ES_SPEC_SCHEMA_PATH,
  OPENAPI_TS_OUTPUT_FILENAME,
  OPENAPI_TS_OUTPUT_FOLDER_PATH,
} from './constants';
import { createAddPropertyAliases } from '../shared/oas_add_property_aliases';
import { alignDefaultWithEnum } from '../shared/oas_align_default_with_enum';
import { createAllowSpecAdditionalProperties } from '../shared/oas_allow_additional_properties';
import {
  allowAnyScriptParams,
  createAllowShortcutProperties,
} from '../shared/oas_allow_shortcut_properties';
import { removeDiscriminatorsWithoutMapping } from '../shared/oas_remove_discriminators_without_mapping';
import { createRemoveServerDefaults } from '../shared/oas_remove_server_defaults';

console.log('Reading OpenAPI spec from ', ES_SPEC_OPENAPI_PATH);
const openApiSpec = JSON.parse(fs.readFileSync(ES_SPEC_OPENAPI_PATH, 'utf8')) as OpenAPIV3.Document;
console.log('Preprocessing OpenAPI spec...');
const preprocessedOpenApiSpec = [
  removeDiscriminatorsWithoutMapping,
  // Restore `@aliases`, `AdditionalProperty` behaviors and `@shortcut_property` from schema.json;
  // the OpenAPI spec drops all three. The shortcut patch goes last: it wraps schemas in `anyOf`,
  // which hides their properties from the other patches.
  createAddPropertyAliases(ES_SPEC_SCHEMA_PATH),
  createAllowSpecAdditionalProperties(ES_SPEC_SCHEMA_PATH),
  allowAnyScriptParams,
  createAllowShortcutProperties(ES_SPEC_SCHEMA_PATH),
  alignDefaultWithEnum,
  // Remove server-side defaults from OpenAPI spec to prevent Zod from applying them client-side
  // This uses schema.json from elasticsearch-specification to identify fields with @server_default
  createRemoveServerDefaults(ES_SPEC_SCHEMA_PATH),
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
