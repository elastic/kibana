/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext } from 'react';

const OutletContext = createContext<{ element?: React.ReactElement } | undefined>(undefined);

export function OutletContextProvider({
  element,
  children,
}: {
  element: React.ReactElement;
  children: React.ReactNode;
}) {
  return <OutletContext.Provider value={{ element }}>{children}</OutletContext.Provider>;
}

export function Outlet() {
  const outletContext = useContext(OutletContext);
  if (!outletContext) {
    throw new Error('Outlet context not available');
  }
  return outletContext.element || null;
}
