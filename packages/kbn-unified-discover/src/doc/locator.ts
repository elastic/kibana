/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { LocatorDefinition } from '@kbn/share-plugin/public';
import { DiscoverSingleDocLocatorParams, DocHistoryLocationState } from './types';

export const DISCOVER_SINGLE_DOC_LOCATOR = 'DISCOVER_SINGLE_DOC_LOCATOR';

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

    const path = `#/doc/${dataViewId}/${rowIndex}?id=${rowId}`;

    return {
      app: 'discover',
      path,
      state,
    };
  };
}
