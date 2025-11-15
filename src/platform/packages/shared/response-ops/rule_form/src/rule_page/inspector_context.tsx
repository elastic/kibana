/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { createContext, useMemo, useContext } from 'react';
import { RequestAdapter } from '@kbn/inspector-plugin/public';

interface IInspectorContext {
  requestsAdapter: RequestAdapter;
}

const InspectorContext = createContext<IInspectorContext | null>(null);

export const RuleFormInspectorProvider = ({ children }: { children: ReactNode }) => {
  const requestsAdapter = useMemo(() => new RequestAdapter(), []);

  const value = useMemo(
    () => ({
      requestsAdapter,
    }),
    [requestsAdapter]
  );

  return <InspectorContext.Provider value={value}>{children}</InspectorContext.Provider>;
};

export const useRuleFormInspector = (): IInspectorContext => {
  const context = useContext(InspectorContext);
  if (!context) {
    throw new Error('useRuleFormInspector must be used within a RuleFormInspectorProvider');
  }
  return context;
};
