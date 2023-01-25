/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createContext, useContext } from 'react';
import { DashboardContainer } from '../embeddable/dashboard_container';

export const DashboardContainerContext = createContext<DashboardContainer | null>(null);

/**
 * A hook, meant to be used internally to the Dashboard container, which returns the full Dashboard Container from the context.
 * @returns the instance of the DashboardContainer.
 */
export const useDashboardContainer = (): DashboardContainer => {
  const dashboard = useContext<DashboardContainer | null>(DashboardContainerContext);
  if (dashboard == null) {
    throw new Error('useDashboardContainer must be used inside DashboardContainerContext.');
  }
  return dashboard!;
};
