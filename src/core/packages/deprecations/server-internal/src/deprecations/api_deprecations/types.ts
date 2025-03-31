/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { RouterDeprecatedApiDetails } from '@kbn/core-http-server';
import type { CoreDeprecatedApiUsageStats } from '@kbn/core-usage-data-server';
import { DocLinksServiceSetup } from '@kbn/core-doc-links-server';
import type { DeprecationsFactory } from '../../deprecations_factory';

export interface ApiDeprecationsServiceDeps {
  deprecationsFactory: DeprecationsFactory;
  http: InternalHttpServiceSetup;
  coreUsageData: InternalCoreUsageDataSetup;
  docLinks: DocLinksServiceSetup;
}

export interface BuildApiDeprecationDetailsParams {
  apiUsageStats: CoreDeprecatedApiUsageStats;
  deprecatedApiDetails: RouterDeprecatedApiDetails;
  docLinks: DocLinksServiceSetup;
}
