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
import Os from 'os';

export const CACHE_MATCH_GLOBS = ['**/target/types/**', '**/tsconfig*.type_check.json'];
export const CACHE_IGNORE_GLOBS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/target_archive/**',
  '.moon/cache/**',
  '.es/**',
  '.es-data/**',
  'data/**',
  '.ftr/**',
  'build/**',
];

export const ARCHIVE_FILE_NAME = 'ts-build-artifacts.tar.gz';

const GCS_BUCKET_NAME = 'ci-artifacts.kibana.dev/ts_type_check';
export const GCS_BUCKET_URI = `gs://${GCS_BUCKET_NAME}`;

export const GCLOUD_ACTIVATE_SCRIPT = Path.resolve(
  REPO_ROOT,
  '.buildkite/scripts/common/activate_service_account.sh'
);

export const LOCAL_CACHE_ROOT = Path.resolve(Os.tmpdir(), 'kibana-ts-type-check-cache');
export const MAX_COMMITS_TO_CHECK = 50;

export const TYPES_DIRECTORY_GLOB = '**/target/types';
export const TYPE_CHECK_CONFIG_GLOB = '**/tsconfig*.type_check.json';
