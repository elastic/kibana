/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { HistoryLocationState } from '../../build_services';

export const DISCOVER_SINGLE_DOC_LOCATOR = 'DISCOVER_SINGLE_DOC_LOCATOR';

export interface DiscoverSingleDocLocatorParams extends SerializableRecord {
  dataViewId: string;
  rowId: string;
  rowIndex: string;
  referrer: string; // discover main view url
}

export type DiscoverSingleDocLocator = LocatorPublic<DiscoverSingleDocLocatorParams>;

export class DiscoverSingleDocLocatorDefinition
  implements LocatorDefinition<DiscoverSingleDocLocatorParams>
{
  public readonly id = DISCOVER_SINGLE_DOC_LOCATOR;

  constructor() {}

  public readonly getLocation = async (params: DiscoverSingleDocLocatorParams) => {
    const { dataViewId, rowId, rowIndex, referrer } = params;

    const state: HistoryLocationState = { referrer };

    const path = `#/doc/${dataViewId}/${rowIndex}?id=${rowId}`;

    return {
      app: 'discover',
      path,
      state,
    };
  };
}
