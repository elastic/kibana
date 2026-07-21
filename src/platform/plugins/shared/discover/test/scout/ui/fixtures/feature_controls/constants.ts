/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRole } from '@kbn/scout';

/**
 * Limits custom-role UI specs to local stateful runs — `browserAuth.loginWithCustomRole`
 * is not yet supported on Elastic Cloud Hosted (ECH).
 */
export const FEATURE_CONTROLS_UI_TAG = '@local-stateful-classic';

const LOGSTASH_READ_INDEX_PRIVILEGE = {
  names: ['logstash-*'],
  privileges: ['read', 'view_index_metadata'],
};

export const DISCOVER_ALL_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [LOGSTASH_READ_INDEX_PRIVILEGE] },
  kibana: [{ base: [], feature: { discover: ['all'] }, spaces: ['*'] }],
};

export const DISCOVER_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [LOGSTASH_READ_INDEX_PRIVILEGE] },
  kibana: [{ base: [], feature: { discover: ['read'] }, spaces: ['*'] }],
};

export const DISCOVER_READ_URL_CREATE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [LOGSTASH_READ_INDEX_PRIVILEGE] },
  kibana: [{ base: [], feature: { discover: ['read', 'url_create'] }, spaces: ['*'] }],
};

export const DISCOVER_ONLY_DATA_VIEWS_ROLE = (aliasName: string): KibanaRole => ({
  elasticsearch: {
    cluster: [],
    indices: [{ names: [aliasName], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [{ base: [], feature: { discover: ['read'] }, spaces: ['*'] }],
});
