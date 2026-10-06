/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
export interface ManagementAppLocatorParams extends SerializableRecord {
  sectionId: string;
  appId?: string;
}
export type ManagementAppLocator = LocatorPublic<ManagementAppLocatorParams>;
export declare class ManagementAppLocatorDefinition
  implements LocatorDefinition<ManagementAppLocatorParams>
{
  readonly id = 'MANAGEMENT_APP_LOCATOR';
  readonly getLocation: (params: ManagementAppLocatorParams) => Promise<{
    app: string;
    path: string;
    state: {};
  }>;
}
