/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';

export const DISCOVER_SINGLE_DOC_LOCATOR = 'DISCOVER_SINGLE_DOC_LOCATOR';

export interface DiscoverSingleDocLocatorParams extends SerializableRecord {
  index: string | DataViewSpec; // spec in case of adhoc data view
  rowId: string;
  rowIndex: string;
  referrer: string; // discover main view url
}

export type DiscoverSingleDocLocator = LocatorPublic<DiscoverSingleDocLocatorParams>;

export interface DocHistoryLocationState {
  referrer: string;
  dataViewSpec?: DataViewSpec;
}

export type DiscoverSingleDocLocatorGetLocation =
  LocatorDefinition<DiscoverSingleDocLocatorParams>['getLocation'];
