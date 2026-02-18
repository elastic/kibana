/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { ServerApiError } from '../../../public/common/types';
import type { EntityAnalyticsPrivileges } from '../entity_analytics';
import type { InitEntityStoreResponse } from '../entity_analytics/entity_store/enable.gen';

export type AssetInventoryStatus =
  | 'inactive_feature'
  | 'disabled'
  | 'initializing'
  | 'empty'
  | 'insufficient_privileges'
  | 'ready';

export interface AssetInventoryStatusResponse {
  status: AssetInventoryStatus;
  privileges?: EntityAnalyticsPrivileges;
}

export type AssetInventoryEnableResponse = InitEntityStoreResponse;

export interface AssetInventoryInstallDataViewResponse {
  body: Promise<DataView | undefined>;
}

export interface AssetInventoryServerApiError {
  body: ServerApiError;
}
