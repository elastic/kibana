/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';

export interface DashboardApplicationService {
  currentAppId$: CoreStart['application']['currentAppId$'];
  navigateToApp: CoreStart['application']['navigateToApp'];
  navigateToUrl: CoreStart['application']['navigateToUrl'];
  getUrlForApp: CoreStart['application']['getUrlForApp'];
  capabilities: {
    advancedSettings: CoreStart['application']['capabilities']['advancedSettings'];
    maps: CoreStart['application']['capabilities']['maps']; // only used in `add_to_library_action`
    navLinks: CoreStart['application']['capabilities']['navLinks'];
    visualize: CoreStart['application']['capabilities']['visualize']; // only used in `add_to_library_action`
  };
}
