/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRole } from '@kbn/scout';
import { LOGSTASH_READ_INDEX_PRIVILEGE } from '../../../common/feature_controls/roles';

export {
  DISCOVER_ALL_ROLE,
  DISCOVER_READ_ROLE,
  DISCOVER_READ_URL_CREATE_ROLE,
} from '../../../common/feature_controls/roles';

export const DISCOVER_VISUALIZE_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [LOGSTASH_READ_INDEX_PRIVILEGE] },
  kibana: [{ base: [], feature: { discover: ['read'], visualize: ['read'] }, spaces: ['*'] }],
};

export const NO_DISCOVER_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [LOGSTASH_READ_INDEX_PRIVILEGE] },
  kibana: [{ base: [], feature: { dashboard: ['all'] }, spaces: ['*'] }],
};

export interface DiscoverCapabilitiesResponse {
  navLinks: Record<string, boolean>;
  catalogue: Record<string, boolean>;
  discover_v2: {
    show: boolean;
    save: boolean;
    createShortUrl: boolean;
    generateCsv?: boolean;
    storeSearchSession?: boolean;
  };
  visualize_v2: {
    show: boolean;
  };
}
