/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRole } from '@kbn/scout';

const readIndexPrivileges = (names: string[]) => [
  {
    names,
    privileges: ['read', 'view_index_metadata'],
  },
  {
    names: ['*'],
    privileges: ['read_view_metadata'],
  },
];

export const DISCOVER_LOGSTASH_VIEWER_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: readIndexPrivileges(['logstash*']),
  },
  kibana: [{ base: ['read'], feature: {}, spaces: ['*'] }],
};

export const DISCOVER_LOGSTASH_ALL_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: readIndexPrivileges(['logstash*']),
  },
  kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
};

export const DISCOVER_LARGE_STRING_VIEWER_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: readIndexPrivileges(['testlargestring']),
  },
  kibana: [{ base: ['read'], feature: {}, spaces: ['*'] }],
};

export const DISCOVER_LARGE_STRING_ALL_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: readIndexPrivileges(['testlargestring']),
  },
  kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
};
