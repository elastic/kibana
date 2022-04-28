/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiStatelessTourStep, EuiText, EuiTourState, EuiTourStep, useEuiTour } from '@elastic/eui';
import React, { useEffect } from 'react';
import { DashboardTourStrings } from './translations';

export const DASHBOARD_VIEW_TOUR_STORAGE_KEY = 'dashboard.view.tourState';
const TOUR_POPOVER_WIDTH = 360;

export const dashboardViewTourConfig = {
  currentTourStep: 1,
  isTourActive: true,
  tourPopoverWidth: TOUR_POPOVER_WIDTH,
};

export const dashboardViewTourSteps = [
  {
    anchor: '[data-test-subj="dashboardEditMode"]',
    step: 1,
    title: DashboardTourStrings.viewModeTour.getTitle(),
    content: <EuiText>{DashboardTourStrings.viewModeTour.getDescription()}</EuiText>,
    anchorPosition: 'downCenter',
    maxWidth: TOUR_POPOVER_WIDTH,
  } as EuiStatelessTourStep,
];

export const DashboardViewTour = () => {
  const initialState = localStorage.getItem(DASHBOARD_VIEW_TOUR_STORAGE_KEY);
  let tourState: Pick<EuiTourState, Exclude<keyof EuiTourState, 'tourSubtitle'>>;
  if (initialState) {
    tourState = { ...JSON.parse(initialState) };
  } else {
    tourState = dashboardViewTourConfig;
  }

  const [[euiTourStepOne], _, reducerState] = useEuiTour(
    dashboardViewTourSteps,
    tourState as EuiTourState
  );

  useEffect(() => {
    localStorage.setItem(DASHBOARD_VIEW_TOUR_STORAGE_KEY, JSON.stringify(reducerState));
  }, [reducerState]);

  return <EuiTourStep {...euiTourStepOne} />;
};
