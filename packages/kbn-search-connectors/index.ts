/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const CONNECTORS_INDEX = '.elastic-connectors';
export const CURRENT_CONNECTORS_INDEX = '.elastic-connectors-v1';
export const CONNECTORS_JOBS_INDEX = '.elastic-connectors-sync-jobs';
export const CURRENT_CONNECTORS_JOB_INDEX = '.elastic-connectors-sync-jobs-v1';
export const CONNECTORS_VERSION = 1;
export const CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX = '.search-acl-filter-';
export const CRAWLER_SERVICE_TYPE = 'elastic-crawler';

export * from './components';
export * from './lib';
export * from './types';
export * from './utils';
