/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { HeaderCollapseState } from '../use_header_collapse';

const noop = () => {};

const FlyoutHeaderCollapseContext = createContext<HeaderCollapseState>({
  isCollapsed: false,
  scrollContainerRef: noop,
  collapsibleRef: noop,
  expandedTitleRef: noop,
  expandedSpacerRef: noop,
  headerRef: noop,
});

export const FlyoutHeaderCollapseProvider = ({
  value,
  children,
}: {
  value: HeaderCollapseState;
  children: ReactNode;
}) => (
  <FlyoutHeaderCollapseContext.Provider value={value}>
    {children}
  </FlyoutHeaderCollapseContext.Provider>
);

export const useFlyoutHeaderCollapse = (): HeaderCollapseState =>
  useContext(FlyoutHeaderCollapseContext);
