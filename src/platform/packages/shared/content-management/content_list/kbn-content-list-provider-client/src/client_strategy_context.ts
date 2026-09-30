/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { ContentListFilterMap } from './filters';

export interface ClientStrategyContextValue {
  getItemsSnapshot: () => UserContentCommonSchema[];
  subscribe: (listener: () => void) => () => void;
  filters: ContentListFilterMap;
}

export const ClientStrategyContext = createContext<ClientStrategyContextValue | undefined>(
  undefined
);

export const useClientStrategyContext = (consumerName: string): ClientStrategyContextValue => {
  const value = useContext(ClientStrategyContext);
  if (!value) {
    throw new Error(`${consumerName} must be used inside <ContentListClientProvider>.`);
  }
  return value;
};
