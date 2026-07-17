/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useContext } from 'react';

interface Context {
  isByReference: boolean;
  exportFullState: boolean;
  setExportFullState: (exportFullState: boolean) => void;
}

export const ExportJsonPanelContext = React.createContext<Context | undefined>(undefined);

export const useExportJsonFlyoutContext = (): Context => {
  const context = useContext(ExportJsonPanelContext);
  if (!context)
    throw new Error(
      'No ExportJsonPanelContext.Provider found when calling useExportJsonFlyoutContext.'
    );
  return context;
};
