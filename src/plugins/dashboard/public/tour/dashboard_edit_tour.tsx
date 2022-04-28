/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiStatelessTourStep, EuiText, EuiTourState, EuiTourStep, useEuiTour } from '@elastic/eui';
import React, { useEffect } from 'react';
import { CustomFooter } from './custom_footer';
import { DashboardTourStrings } from './translations';

export const DASHBOARD_EDIT_TOUR_STORAGE_KEY = 'dashboard.edit.tourState';
const TOUR_POPOVER_WIDTH = 360;

const dashboardEditTourConfig = {
  currentTourStep: 1,
  isTourActive: true,
  tourPopoverWidth: 360,
  tourSubtitle: DashboardTourStrings.editModeTour.getTitle(),
};

const dashboardEditTourSteps = [
  {
    anchor: '[data-test-subj="dashboardAddNewPanelButton"]',
    step: 1,
    title: DashboardTourStrings.editModeTour.firstStep.getTitle(),
    content: <EuiText>{DashboardTourStrings.editModeTour.firstStep.getDescription()}</EuiText>,
    anchorPosition: 'rightCenter',
    maxWidth: TOUR_POPOVER_WIDTH,
  } as EuiStatelessTourStep,
  {
    anchor: '[data-test-subj="embeddablePanelToggleMenuIcon"]',
    step: 2,
    title: DashboardTourStrings.editModeTour.secondStep.getTitle(),
    content: <EuiText>{DashboardTourStrings.editModeTour.secondStep.getDescription()}</EuiText>,
    anchorPosition: 'upCenter',
    maxWidth: TOUR_POPOVER_WIDTH,
  } as EuiStatelessTourStep,
  {
    anchor: '.kbnQueryBar__datePickerWrapper',
    step: 3,
    title: DashboardTourStrings.editModeTour.thirdStep.getTitle(),
    content: <EuiText>{DashboardTourStrings.editModeTour.thirdStep.getDescription()}</EuiText>,
    anchorPosition: 'downCenter',
    maxWidth: TOUR_POPOVER_WIDTH,
  } as EuiStatelessTourStep,
  {
    anchor: '#addFilterPopover',
    step: 4,
    title: DashboardTourStrings.editModeTour.fourthStep.getTitle(),
    content: <EuiText>{DashboardTourStrings.editModeTour.fourthStep.getDescription()}</EuiText>,
    anchorPosition: 'downLeft',
    maxWidth: TOUR_POPOVER_WIDTH,
  } as EuiStatelessTourStep,
  {
    anchor: '[data-test-subj="dashboard-controls-menu-button"]',
    step: 5,
    title: DashboardTourStrings.editModeTour.fifthStep.getTitle(),
    content: <EuiText>{DashboardTourStrings.editModeTour.fifthStep.getDescription()}</EuiText>,
    anchorPosition: 'upCenter',
    maxWidth: TOUR_POPOVER_WIDTH,
  } as EuiStatelessTourStep,
];

export const DashboardEditTour = ({ panelCount }: { panelCount: number }) => {
  const initialState = localStorage.getItem(DASHBOARD_EDIT_TOUR_STORAGE_KEY);
  let tourState: EuiTourState;
  if (initialState) {
    tourState = JSON.parse(initialState);
  } else {
    tourState = dashboardEditTourConfig;
  }

  const [
    [euiTourStepOne, euiTourStepTwo, euiTourStepThree, euiTourStepFour, euiTourStepFive],
    actions,
    reducerState,
  ] = useEuiTour(dashboardEditTourSteps, tourState);

  useEffect(() => {
    localStorage.setItem(DASHBOARD_EDIT_TOUR_STORAGE_KEY, JSON.stringify(reducerState));
  }, [reducerState]);

  const commonFooterProps = {
    onSkip: () => actions.finishTour(),
    onNext: () => actions.incrementStep(),
  };

  const skipVisualizationStep = () => {
    if (panelCount > 0) {
      actions.incrementStep();
    } else {
      actions.goToStep(3);
    }
  };

  const TourSteps = () => {
    return (
      <>
        <EuiTourStep
          {...euiTourStepOne}
          footerAction={
            <CustomFooter
              onSkip={() => actions.finishTour()}
              onNext={() => skipVisualizationStep()}
            />
          }
        />
        <EuiTourStep {...euiTourStepTwo} footerAction={<CustomFooter {...commonFooterProps} />} />
        <EuiTourStep {...euiTourStepThree} footerAction={<CustomFooter {...commonFooterProps} />} />
        <EuiTourStep {...euiTourStepFour} footerAction={<CustomFooter {...commonFooterProps} />} />
        <EuiTourStep {...euiTourStepFive} />
      </>
    );
  };

  return <TourSteps />;
};
