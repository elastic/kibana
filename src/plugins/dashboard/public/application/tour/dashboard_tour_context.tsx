/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { createContext, useContext } from 'react';

export interface DashboardTourContextProps {
  currentEditTourStep: number;
  getNextEditTourStep: (step?: number) => void;
  finishEditTour: () => void;
  onViewModeChange: (newMode: ViewMode) => void;
  setTourVisibility: (visibility: boolean) => void;
}

export const DashboardTourContext = createContext<DashboardTourContextProps>({
  currentEditTourStep: -1,
  getNextEditTourStep: () => {},
  finishEditTour: () => {},
  onViewModeChange: () => {},
  setTourVisibility: () => {},
});

export const useDashboardEditTourContext = () => {
  return useContext(DashboardTourContext);
};
