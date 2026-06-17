/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import type { NavExtensionData, NavExtensionId } from '@kbn/core-chrome-browser';
import type { NavExtensionDefinition } from '@kbn/shared-ux-navigation-extension-templates';
import type { Observable } from 'rxjs';

export interface DashboardNavExtension<Id extends NavExtensionId = NavExtensionId> {
  definition: NavExtensionDefinition<Id>;
  createData$: (core: CoreStart) => Observable<NavExtensionData<Id>>;
}
