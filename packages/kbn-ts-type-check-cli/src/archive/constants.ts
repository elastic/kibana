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

/**
 * globs for the archive
 */
export const CACHE_MATCH_GLOBS = ['**/target/types/**', '**/tsconfig*.type_check.json'];
export const CACHE_IGNORE_GLOBS = [
  '**/node_modules/**',
  '**/.git/**',
  '.moon/cache/**',
  '.es/**',
  '.es-data/**',
  'data/**',
  '.ftr/**',
  'build/**',
];

export const ARCHIVE_FILE_NAME = 'ts-build-artifacts.tar.gz';
export const ARCHIVE_METADATA_FILE_NAME = 'ts-build-artifacts.meta.json';

export const GCS_BUCKET_NAME = 'ci-typescript-archives';

export const GCS_BUCKET_PATH = 'ts_type_check';

export const GCS_BUCKET_URI = `gs://${GCS_BUCKET_NAME}/${GCS_BUCKET_PATH}`;

export const COMMITS_PATH = `commits`;
export const PULL_REQUESTS_PATH = `prs`;
export const GCS_COMMITS_PREFIX = `${GCS_BUCKET_URI}/${COMMITS_PATH}`;
export const GCS_PULL_REQUESTS_PREFIX = `${GCS_BUCKET_URI}/${PULL_REQUESTS_PATH}`;

export const GCLOUD_ACTIVATE_SCRIPT = Path.resolve(
  REPO_ROOT,
  '.buildkite/scripts/common/activate_service_account.sh'
);

const BASE_DIR = Path.resolve(Os.tmpdir(), 'kibana-ts-type-check-cache');

export const TMP_DIR = Path.join(BASE_DIR, 'tmp');
export const LOCAL_CACHE_ROOT = Path.join(BASE_DIR, 'archives');

export const MAX_COMMITS_TO_CHECK = 50;

export const TYPES_DIRECTORY_GLOB = '**/target/types';
export const TYPE_CHECK_CONFIG_GLOB = '**/tsconfig*.type_check.json';

/**
 * Files that should be hashed and checked for cache invalidation.
 * If any of these files change, the cache should be invalidated.
 */
export const CACHE_INVALIDATION_FILES = ['yarn.lock', '.nvmrc', '.node-version'];
