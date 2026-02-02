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
  'src/platform/packages/shared/kbn-workflows/scripts/generate_kibana_connectors'
);
const KIBANA_SPEC_OUTPUT_PATH = Path.resolve(REPO_ROOT, 'oas_docs/output');
const KIBANA_SPEC_OPENAPI_PATH = Path.resolve(KIBANA_SPEC_OUTPUT_PATH, 'kibana.yaml');
// output
const KIBANA_GENERATED_OUTPUT_FOLDER_PATH = Path.resolve(
  REPO_ROOT,
  'src/platform/packages/shared/kbn-workflows/spec/kibana/generated'
);

const KIBANA_CONTRACTS_OUTPUT_FILE_PATH = Path.resolve(
  KIBANA_GENERATED_OUTPUT_FOLDER_PATH,
  'index.ts'
);
const OPENAPI_TS_OUTPUT_FOLDER_PATH = Path.resolve(KIBANA_GENERATED_OUTPUT_FOLDER_PATH, 'schemas');
const OPENAPI_TS_CONFIG_PATH = Path.resolve(SCRIPT_FOLDER_PATH, 'openapi_ts.config.ts');
const OPENAPI_TS_OUTPUT_FILENAME = 'kibana_openapi_zod'; // .gen.ts will be added automatically

export {
  KIBANA_SPEC_OUTPUT_PATH,
  KIBANA_SPEC_OPENAPI_PATH,
  KIBANA_GENERATED_OUTPUT_FOLDER_PATH,
  KIBANA_CONTRACTS_OUTPUT_FILE_PATH,
  OPENAPI_TS_CONFIG_PATH,
  OPENAPI_TS_OUTPUT_FOLDER_PATH,
  OPENAPI_TS_OUTPUT_FILENAME,
};
