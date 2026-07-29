/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRole } from '@kbn/scout';

export {
  DISCOVER_ALL_ROLE,
  DISCOVER_READ_ROLE,
  DISCOVER_READ_URL_CREATE_ROLE,
} from '../../../common/feature_controls/roles';

/**
 * Limits custom-role UI specs to local stateful runs — `browserAuth.loginWithCustomRole`
 * is not yet supported on Elastic Cloud Hosted (ECH).
 */
export const FEATURE_CONTROLS_UI_TAG = '@local-stateful-classic';

export const DISCOVER_ONLY_DATA_VIEWS_ROLE = (aliasName: string): KibanaRole => ({
  elasticsearch: {
    cluster: [],
    indices: [{ names: [aliasName], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [{ base: [], feature: { discover: ['read'] }, spaces: ['*'] }],
});
