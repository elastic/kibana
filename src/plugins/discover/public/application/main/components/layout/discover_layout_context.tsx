/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactNode, useMemo, useState } from 'react';

export interface DiscoverLayoutContextProps {
  isPlainRecord: boolean;
  setIsPlainRecord: (newIsPlainRecord: boolean) => void;
}

const defaultContext = {};

export const DiscoverLayoutContext = React.createContext<DiscoverLayoutContextProps>(
  defaultContext as DiscoverLayoutContextProps
);

export const DiscoverLayoutContextProvider = ({
  initialIsPlainRecord,
  children,
}: {
  initialIsPlainRecord: boolean;
  children: ReactNode;
}) => {
  const [isPlainRecord, setIsPlainRecord] = useState(initialIsPlainRecord);

  const value = useMemo(
    () => ({
      isPlainRecord,
      setIsPlainRecord,
    }),
    [isPlainRecord]
  );

  return <DiscoverLayoutContext.Provider value={value}>{children}</DiscoverLayoutContext.Provider>;
};
