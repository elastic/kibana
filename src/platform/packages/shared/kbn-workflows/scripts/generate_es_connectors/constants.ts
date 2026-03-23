/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

// source
const SCRIPT_FOLDER_PATH = Path.resolve(
  REPO_ROOT,
  'src/platform/packages/shared/kbn-workflows/scripts/generate_es_connectors'
);
const ES_SPEC_OUTPUT_PATH = Path.resolve(REPO_ROOT, '../elasticsearch-specification/output');
const ES_SPEC_SCHEMA_PATH = Path.resolve(ES_SPEC_OUTPUT_PATH, 'schema/schema.json');
const ES_SPEC_OPENAPI_PATH = Path.resolve(
  ES_SPEC_OUTPUT_PATH,
  'openapi/elasticsearch-openapi.json'
);
// output
const ES_GENERATED_OUTPUT_FOLDER_PATH = Path.resolve(
  REPO_ROOT,
  'src/platform/packages/shared/kbn-workflows/spec/elasticsearch/generated'
);

const ES_CONTRACTS_OUTPUT_FILE_PATH = Path.resolve(ES_GENERATED_OUTPUT_FOLDER_PATH, 'index.ts');
const OPENAPI_TS_OUTPUT_FOLDER_PATH = Path.resolve(ES_GENERATED_OUTPUT_FOLDER_PATH, 'schemas');
const OPENAPI_TS_CONFIG_PATH = Path.resolve(SCRIPT_FOLDER_PATH, 'openapi_ts.config.ts');
const OPENAPI_TS_OUTPUT_FILENAME = 'es_openapi_zod'; // .gen.ts will be added automatically

export {
  ES_SPEC_OUTPUT_PATH,
  ES_SPEC_SCHEMA_PATH,
  ES_SPEC_OPENAPI_PATH,
  ES_GENERATED_OUTPUT_FOLDER_PATH,
  ES_CONTRACTS_OUTPUT_FILE_PATH,
  OPENAPI_TS_CONFIG_PATH,
  OPENAPI_TS_OUTPUT_FOLDER_PATH,
  OPENAPI_TS_OUTPUT_FILENAME,
};
