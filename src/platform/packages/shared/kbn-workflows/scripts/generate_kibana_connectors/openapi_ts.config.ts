/* eslint-disable @kbn/eslint/require-license-header */
/* eslint-disable import/no-default-export */

import type { UserConfig } from '@hey-api/openapi-ts';
import {
  KIBANA_SPEC_OPENAPI_PATH,
  OPENAPI_TS_OUTPUT_FILENAME,
  OPENAPI_TS_OUTPUT_FOLDER_PATH,
} from './constants';

const config: UserConfig = {
  input: KIBANA_SPEC_OPENAPI_PATH,
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
