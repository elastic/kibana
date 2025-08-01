/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';

interface NestedMenuContextValue {
  currentPanel: string;
  goToPanel: (panelId: string) => void;
  goBack: () => void;
  canGoBack: boolean;
}

export const NestedMenuContext = createContext<NestedMenuContextValue | null>(null);

export const useNestedMenu = () => {
  const context = useContext(NestedMenuContext);
  if (!context) {
    throw new Error('useNestedMenu must be used within a NestedSecondaryMenu');
  }
  return context;
};
