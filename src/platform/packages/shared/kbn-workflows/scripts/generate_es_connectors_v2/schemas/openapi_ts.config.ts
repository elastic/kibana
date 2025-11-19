/* eslint-disable @kbn/eslint/require-license-header */
/* eslint-disable import/no-default-export */
// import type { UserConfig } from '@hey-api/openapi-ts';

import { ES_SPEC_OPENAPI_PATH, OPENAPI_TS_OUTPUT_FOLDER_PATH } from '../constants';

const config = {
  // debuging on just one endpoint
  parser: {
    filters: {
      tags: {
        include: ['search'],
      },
      // operations: {
      //   include: ['GET /{index}/_search'],
      // },
    },
  },
  input: ES_SPEC_OPENAPI_PATH,
  output: OPENAPI_TS_OUTPUT_FOLDER_PATH,
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
    },
  ],
};

export default config;
