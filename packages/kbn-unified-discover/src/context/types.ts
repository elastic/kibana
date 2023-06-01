/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import type { LocatorPublic } from '@kbn/share-plugin/common';

export interface DiscoverContextAppLocatorParams extends SerializableRecord {
  index: string | DataViewSpec; // spec in case of adhoc data view
  rowId: string;
  columns?: string[];
  filters?: Filter[];
  referrer: string; // discover main view url
}

export type DiscoverContextAppLocator = LocatorPublic<DiscoverContextAppLocatorParams>;

export interface DiscoverContextAppLocatorDependencies {
  useHash: boolean;
}

export interface ContextHistoryLocationState {
  referrer: string;
  dataViewSpec?: DataViewSpec;
}
