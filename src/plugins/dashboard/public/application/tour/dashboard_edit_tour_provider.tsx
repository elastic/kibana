/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useEuiTour,
  EuiTourState,
  EuiTourStep,
  EuiTourStepProps,
  EuiText,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiI18n,
} from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { DashboardTourContext, DashboardTourContextProps } from './dashboard_edit_tour_context';
import { DashboardTourStrings } from './translations';
import { CustomFooter } from './custom_footer';

const DASHBOARD_TOUR_STORAGE_KEY = 'dashboard.tourState';
const MAX_WIDTH = 350;
const FIRST_STEP = 1;

interface DashboardTourState {
  viewTourComplete: boolean;
  editTourState: EuiTourState;
}

interface TourStepDefinition {
  anchor: EuiTourStepProps['anchor'];
  title: EuiTourStepProps['title'];
  content: EuiTourStepProps['content'];
  anchorPosition: EuiTourStepProps['anchorPosition'];
}

const tourConfig: EuiTourState = {
  currentTourStep: FIRST_STEP,
  isTourActive: false,
  tourPopoverWidth: MAX_WIDTH,
  tourSubtitle: '',
};

const defaultTourState: DashboardTourState = {
  viewTourComplete: false,
  editTourState: tourConfig,
};

const viewTourStepDefinitions: TourStepDefinition[] = [
  {
    anchor: '[data-test-subj="dashboardEditMode"]',
    title: DashboardTourStrings.viewModeTour.getTitle(),
    content: <EuiText>{DashboardTourStrings.viewModeTour.getDescription()}</EuiText>,
    anchorPosition: 'downCenter',
  },
];

const editTourStepDefinitions: TourStepDefinition[] = [
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

export const DashboardEditTourProvider: React.FC<{ viewMode: boolean; editMode: boolean }> = ({
  viewMode,
  editMode,
  children,
}) => {
  const initialState = localStorage.getItem(DASHBOARD_TOUR_STORAGE_KEY);
  let tourState: DashboardTourState;
  if (initialState) {
    tourState = JSON.parse(initialState);
  } else {
    tourState = {
      ...defaultTourState,
      editTourState: { ...tourConfig, isTourActive: editMode },
    };
  }
  const dashboardTourStateRef = useRef(tourState);
  const editTourSteps = prepareTourSteps(editTourStepDefinitions);
  const viewTourStep = prepareTourSteps(viewTourStepDefinitions)[0];
  const [editSteps, editActions, editReducerState] = useEuiTour(
    editTourSteps,
    dashboardTourStateRef.current.editTourState
  );
  const { currentTourStep: currentEditTourStep, isTourActive: isEditTourActive } = editReducerState;
  const [isViewTourActive, setViewTourActive] = useState(
    viewMode && !dashboardTourStateRef.current.viewTourComplete
  );
  const [stepVisible, setStepVisible] = useState(true);

  useEffect(() => {
    localStorage.setItem(
      DASHBOARD_TOUR_STORAGE_KEY,
      JSON.stringify({
        ...dashboardTourStateRef.current,
        editTourState: editReducerState,
      })
    );
  }, [editReducerState, dashboardTourStateRef.current.viewTourComplete]);

  const getNextEditTourStep = useCallback(
    (step?: number) => {
      if (step) {
        editActions.goToStep(step);
        return;
      }

      const nextAvailableStep = findNextAvailableStep(editSteps, currentEditTourStep);
      if (nextAvailableStep) {
        editActions.goToStep(nextAvailableStep);
      } else {
        editActions.finishTour();
      }
    },
    [editActions, editSteps, currentEditTourStep]
  );

  const finishEditTour = useCallback(() => {
    editActions.finishTour();
  }, [editActions]);

  const finishViewTour = useCallback(() => {
    setViewTourActive(false);
    dashboardTourStateRef.current.viewTourComplete = true;
  }, [dashboardTourStateRef]);

  const onViewModeChange = useCallback(
    (newMode: ViewMode) => {
      if (editMode && newMode === ViewMode.VIEW) {
        setViewTourActive(!dashboardTourStateRef.current.viewTourComplete);
        editReducerState.isTourActive = false;
      } else if (viewMode && newMode === ViewMode.EDIT) {
        finishViewTour();
        editReducerState.isTourActive = true;
      }
    },
    [editMode, viewMode, editReducerState, finishViewTour]
  );

  const setTourVisibility = useCallback(
    (newVisibility: boolean) => {
      setStepVisible(newVisibility);
    },
    [setStepVisible]
  );

  const contextValue: DashboardTourContextProps = useMemo(
    () => ({
      currentEditTourStep,
      getNextEditTourStep,
      finishEditTour,
      onViewModeChange,
      setTourVisibility,
    }),
    [currentEditTourStep, getNextEditTourStep, finishEditTour, onViewModeChange, setTourVisibility]
  );

  return (
    <>
      {/* <p>
        {JSON.stringify(reducerState)}
        <br />
        {isTourActive ? 'tour active' : 'tour NOT active'}
        <br />
        {stepVisible ? 'step visible' : 'step NOT visible'}
      </p> */}
      <DashboardTourContext.Provider value={contextValue}>
        {stepVisible && (
          <>
            {isViewTourActive ? (
              <EuiTourStep
                key={`view-step`}
                {...viewTourStep}
                isStepOpen={true}
                footerAction={
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      color="text"
                      size="xs"
                      onClick={finishViewTour}
                      data-test-subj="discoverTourButtonSkip"
                    >
                      {EuiI18n({ token: 'core.euiTourStep.closeTour', default: 'Close tour' })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                }
              />
            ) : (
              <>
                {isEditTourActive &&
                  editSteps.map((step) => (
                    <EuiTourStep
                      key={`edit-step-${step.step}-is-${String(step.isStepOpen)}`}
                      {...step}
                      footerAction={
                        <CustomFooter
                          isLastStep={step.step === editSteps[editSteps.length - 1].step}
                          onNextTourStep={() => getNextEditTourStep()}
                          onFinishTour={finishEditTour}
                        />
                      }
                    />
                  ))}
              </>
            )}
          </>
        )}
        {children}
      </DashboardTourContext.Provider>
    </>
  );
};
