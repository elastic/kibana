/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DeepPartial } from '@kbn/utility-types';
import { noop } from 'lodash';
import React, { createContext, FC, useContext, useMemo, useState } from 'react';

export enum DataSourceType {
  DataView = 'data_view',
  Esql = 'esql',
}

export interface DiscoverRuntimeContext {
  /**
   * The type of data source that is currently being used.
   */
  dataSourceType: DataSourceType;
}

export interface DiscoverRuntimeContextEvents {
  /**
   * Fired when the data source type changes.
   */
  onDataSourceTypeChange: (dataSourceType: DataSourceType) => void;
}

export const createDiscoverRuntimeContext = (
  runtimeContext: DeepPartial<DiscoverRuntimeContext> = {}
): Readonly<DiscoverRuntimeContext> => {
  return {
    dataSourceType: runtimeContext.dataSourceType ?? DataSourceType.DataView,
  };
};

const runtimeContext = createContext(createDiscoverRuntimeContext());

export const createDiscoverRuntimeContextEvents = (): DiscoverRuntimeContextEvents => ({
  onDataSourceTypeChange: noop,
});

const eventsContext = createContext(createDiscoverRuntimeContextEvents());

export const DiscoverRuntimeContextProvider: FC = ({ children }) => {
  const [context, setContext] = useState(createDiscoverRuntimeContext());

  const events = useMemo<DiscoverRuntimeContextEvents>(
    () => ({
      onDataSourceTypeChange: (dataSourceType: DataSourceType) => {
        setContext((ctx) => ({ ...ctx, dataSourceType }));
      },
    }),
    []
  );

  return (
    <runtimeContext.Provider value={context}>
      <eventsContext.Provider value={events}>{children}</eventsContext.Provider>
    </runtimeContext.Provider>
  );
};

export const useDiscoverRuntimeContext = () => useContext(runtimeContext);

export const useDiscoverRuntimeContextEvents = () => useContext(eventsContext);
