/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, useMemo } from 'react';
import { resolveTimeRange, type ResolvedTimeRange } from './time_domain';

const FlyoutTimeRangeContext = createContext<{ from: string; to: string } | undefined>(undefined);

/** Selected flyout time picker value. Charts, logs, and alerts read it from here. */
export const FlyoutTimeRangeProvider = ({
  from,
  to,
  children,
}: {
  readonly from: string;
  readonly to: string;
  readonly children: React.ReactNode;
}) => {
  const value = useMemo(() => ({ from, to }), [from, to]);
  return <FlyoutTimeRangeContext.Provider value={value}>{children}</FlyoutTimeRangeContext.Provider>;
};

/** Absolute bounds of the picker, or undefined when nothing has provided one. */
export const useResolvedFlyoutTimeRange = (): ResolvedTimeRange | undefined => {
  const range = useContext(FlyoutTimeRangeContext);
  return useMemo(
    () => (range ? resolveTimeRange(range.from, range.to) : undefined),
    [range]
  );
};
