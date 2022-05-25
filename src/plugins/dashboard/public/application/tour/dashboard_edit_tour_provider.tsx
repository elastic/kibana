/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useEuiTour, EuiTourState, EuiTourStep, EuiTourStepProps, EuiText } from '@elastic/eui';
import { DashboardTourContext, DashboardTourContextProps } from './dashboard_edit_tour_context';
import { DashboardTourStrings } from './translations';
import { CustomFooter } from './custom_footer';

const MAX_WIDTH = 350;
const FIRST_STEP = 1;
const DASHBOARD_EDIT_TOUR_STORAGE_KEY = 'dashboard.edit.tourState';

const tourConfig: EuiTourState = {
  currentTourStep: FIRST_STEP,
  isTourActive: true,
  tourPopoverWidth: MAX_WIDTH,
  tourSubtitle: '',
};

interface TourStepDefinition {
  anchor: EuiTourStepProps['anchor'];
  title: EuiTourStepProps['title'];
  content: EuiTourStepProps['content'];
  anchorPosition: EuiTourStepProps['anchorPosition'];
}

const tourStepDefinitions: TourStepDefinition[] = [
  {
    anchor: '[data-test-subj="dashboardAddNewPanelButton"]',
    title: DashboardTourStrings.editModeTour.createVisualization.getTitle(),
    content: DashboardTourStrings.editModeTour.createVisualization.getDescription(),
    anchorPosition: 'rightCenter',
  },
  {
    anchor: '[data-test-subj="embeddablePanelToggleMenuIcon"]',
    title: DashboardTourStrings.editModeTour.panelOptions.getTitle(),
    content: DashboardTourStrings.editModeTour.panelOptions.getDescription(),
    anchorPosition: 'upCenter',
  },
  {
    anchor: '.kbnQueryBar__datePickerWrapper',
    title: DashboardTourStrings.editModeTour.timePicker.getTitle(),
    content: DashboardTourStrings.editModeTour.timePicker.getDescription(),
    anchorPosition: 'downCenter',
  },
  {
    anchor: '#addFilterPopover',
    title: DashboardTourStrings.editModeTour.filters.getTitle(),
    content: DashboardTourStrings.editModeTour.filters.getDescription(),
    anchorPosition: 'downLeft',
  },
  {
    anchor: '[data-test-subj="dashboard-controls-menu-button"]',
    title: DashboardTourStrings.editModeTour.controls.getTitle(),
    content: DashboardTourStrings.editModeTour.controls.getDescription(),
    anchorPosition: 'upCenter',
  },
];

const prepareTourSteps = (stepDefinitions: TourStepDefinition[]): EuiTourStepProps[] =>
  stepDefinitions.map((stepDefinition, index) => ({
    step: index + 1,
    anchor: stepDefinition.anchor,
    title: stepDefinition.title,
    anchorPosition: stepDefinition.anchorPosition,
    maxWidth: MAX_WIDTH,
    content: (
      <>
        <EuiText>
          <p>{stepDefinition.content}</p>
        </EuiText>
      </>
    ),
  })) as EuiTourStepProps[];

const findNextAvailableStep = (
  steps: EuiTourStepProps[],
  currentTourStep: number
): number | null => {
  const nextStep = steps.find(
    (step) =>
      step.step > currentTourStep &&
      typeof step.anchor === 'string' &&
      document.querySelector(step.anchor)
  );

  return nextStep?.step ?? null;
};

export const DashboardEditTourProvider: React.FC = ({ children }) => {
  // console.log('children:', children);
  const initialState = localStorage.getItem(DASHBOARD_EDIT_TOUR_STORAGE_KEY);
  let tourState: EuiTourState;
  if (initialState) {
    tourState = JSON.parse(initialState);
  } else {
    tourState = tourConfig;
  }
  const tourSteps = prepareTourSteps(tourStepDefinitions);
  const [steps, actions, reducerState] = useEuiTour(tourSteps, tourState);
  const currentTourStep = reducerState.currentTourStep;
  const isTourActive = reducerState.isTourActive;
  // console.log(reducerState);

  useEffect(() => {
    // console.log('set local storage');
    localStorage.setItem(DASHBOARD_EDIT_TOUR_STORAGE_KEY, JSON.stringify(reducerState));
  }, [reducerState]);

  const onStartTour = useCallback(() => {
    // console.log('on start tour');
    actions.resetTour();
    actions.goToStep(2);
  }, [actions]);

  const onNextTourStep = useCallback(() => {
    // console.log('on next tour step');
    const nextAvailableStep = findNextAvailableStep(steps, currentTourStep);
    if (nextAvailableStep) {
      actions.goToStep(nextAvailableStep);
    } else {
      actions.finishTour();
    }
  }, [actions, steps, currentTourStep]);

  const onFinishTour = useCallback(() => {
    actions.finishTour();
  }, [actions]);

  const contextValue: DashboardTourContextProps = useMemo(
    () => ({
      onStartTour,
      onNextTourStep,
      onFinishTour,
    }),
    [onStartTour, onNextTourStep, onFinishTour]
  );

  return (
    <>
      {JSON.stringify(reducerState)}
      <DashboardTourContext.Provider value={contextValue}>
        {isTourActive &&
          steps.map((step) => (
            <EuiTourStep
              key={`step-${step.step}-is-${String(step.isStepOpen)}`}
              {...step}
              footerAction={
                <CustomFooter
                  isLastStep={step.step === steps[steps.length - 1].step}
                  onNextTourStep={onNextTourStep}
                  onFinishTour={onFinishTour}
                />
              }
            />
          ))}
        {children}
      </DashboardTourContext.Provider>
    </>
  );
};
