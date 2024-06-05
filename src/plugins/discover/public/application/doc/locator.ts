/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { DataViewSpec } from '@kbn/data-views-plugin/public';

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

export class DiscoverSingleDocLocatorDefinition
  implements LocatorDefinition<DiscoverSingleDocLocatorParams>
{
  public readonly id = DISCOVER_SINGLE_DOC_LOCATOR;

  constructor() {}

  public readonly getLocation = async (params: DiscoverSingleDocLocatorParams) => {
    const { index, rowId, rowIndex, referrer } = params;

    let dataViewId;
    const state: DocHistoryLocationState = { referrer };
    if (typeof index === 'object') {
      state.dataViewSpec = index;
      dataViewId = index.id!;
    } else {
      dataViewId = index;
    }

    const path = `#/doc/${dataViewId}/${rowIndex}?id=${encodeURIComponent(rowId)}`;

    return {
      app: 'discover',
      path,
      state,
    };
  };
}
