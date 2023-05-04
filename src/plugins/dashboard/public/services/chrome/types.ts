/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreStart } from '@kbn/core/public';

export interface DashboardChromeService {
  docTitle: CoreStart['chrome']['docTitle'];
  setBadge: CoreStart['chrome']['setBadge'];
  getIsVisible$: CoreStart['chrome']['getIsVisible$'];
  recentlyAccessed: CoreStart['chrome']['recentlyAccessed'];
  setBreadcrumbs: CoreStart['chrome']['setBreadcrumbs'];
  setHelpExtension: CoreStart['chrome']['setHelpExtension'];
  setIsVisible: CoreStart['chrome']['setIsVisible'];
}
