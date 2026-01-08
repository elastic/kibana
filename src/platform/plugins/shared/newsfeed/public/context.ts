/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { FetchResult } from './types';

export interface NewsfeedContextValue {
  setFlyoutVisible: React.Dispatch<React.SetStateAction<boolean>>;
  newsFetchResult: FetchResult | void | null;
}

export const NewsfeedContext = React.createContext<NewsfeedContextValue | null>(null);

export const useNewsfeedContext = (): NewsfeedContextValue => {
  const context = React.useContext(NewsfeedContext);
  if (!context) {
    throw new Error('useNewsfeedContext must be used within a NewsfeedContextProvider');
  }
  return context;
};
