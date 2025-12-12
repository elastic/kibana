/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';

// Base path for ESQL documentation within the elasticsearch repository
export const ELASTISEARCH_ESQL_DOCS_BASE_PATH = path.join(
  'docs',
  'reference',
  'query-languages',
  'esql',
  'kibana'
);

// Suffixes for specific elasticsearch ESQL content directories
export const DEFINITION_DIR_SUFFIX = 'definition';
export const DOCS_DIR_SUFFIX = 'docs';

// Output directory for the generated files relative to the scripts
export const OUTPUT_DIR = path.resolve(__dirname, '../src/sections/generated');
