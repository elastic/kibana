/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverSingleDocLocatorGetLocation, DocHistoryLocationState } from './locator';

export const singleDocLocatorGetLocation = async (
  ...[params]: Parameters<DiscoverSingleDocLocatorGetLocation>
): ReturnType<DiscoverSingleDocLocatorGetLocation> => {
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
