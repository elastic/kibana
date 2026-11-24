/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';

const ChartLoadedContext = createContext<ChartSectionProps['onChartLoaded']>(undefined);

interface ChartLoadedContextProviderProps {
  onChartLoaded: ChartSectionProps['onChartLoaded'];
}

/**
 * Provides the callback to report that a chart of the section finished loading with data.
 */
export const ChartLoadedContextProvider = ({
  onChartLoaded,
  children,
}: PropsWithChildren<ChartLoadedContextProviderProps>) => (
  <ChartLoadedContext.Provider value={onChartLoaded}>{children}</ChartLoadedContext.Provider>
);

/**
 * Returns the optional callback to report that a chart of the section finished loading with data.
 */
export const useOnChartLoaded = (): ChartSectionProps['onChartLoaded'] =>
  useContext(ChartLoadedContext);
