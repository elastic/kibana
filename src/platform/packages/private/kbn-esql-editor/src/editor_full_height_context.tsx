/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, useMemo } from 'react';

export interface EsqlEditorFullHeightContextValue {
  isFullHeight: boolean;
  toggleFullHeight: () => void;
}

const EsqlEditorFullHeightContext = createContext<EsqlEditorFullHeightContextValue | null>(null);

/** Lets a host page dock the ES|QL editor into a full-height layout. */
export function EsqlEditorFullHeightProvider({
  isFullHeight,
  toggleFullHeight,
  children,
}: EsqlEditorFullHeightContextValue & { children: React.ReactNode }) {
  const value = useMemo(
    () => ({ isFullHeight, toggleFullHeight }),
    [isFullHeight, toggleFullHeight]
  );

  return (
    <EsqlEditorFullHeightContext.Provider value={value}>
      {children}
    </EsqlEditorFullHeightContext.Provider>
  );
}

export function useEsqlEditorFullHeight() {
  return useContext(EsqlEditorFullHeightContext);
}
