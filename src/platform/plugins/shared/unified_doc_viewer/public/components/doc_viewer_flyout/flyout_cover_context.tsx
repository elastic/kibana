/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext } from 'react';

export interface FlyoutCoverState {
  readonly isFlyoutCovered: boolean;
  setIsFlyoutCovered: (isFlyoutCovered: boolean) => void;
}

// This context is used to control whether the doc detail flyout is covered by another UI element
const FlyoutCoverContext = createContext<FlyoutCoverState | undefined>(undefined);

// Provider for the flyout cover context
export const FlyoutCoverProvider = ({
  value,
  children,
}: {
  value: FlyoutCoverState;
  children: React.ReactNode;
}) => {
  return <FlyoutCoverContext.Provider value={value}>{children}</FlyoutCoverContext.Provider>;
};

export const useFlyoutCover = () => useContext(FlyoutCoverContext);
