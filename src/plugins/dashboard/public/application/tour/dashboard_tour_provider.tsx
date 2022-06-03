/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEuiTour, EuiTourState, EuiTourStep } from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { DashboardTourContext, DashboardTourContextProps } from './dashboard_tour_context';
import { EditTourFooter, ViewTourFooter } from './custom_footers';
import {
  FIRST_STEP,
  MAX_WIDTH,
  editTourStepDefinitions,
  viewTourStepDefinitions,
  findNextAvailableStep,
  prepareTourSteps,
} from './tour_steps';

const DASHBOARD_TOUR_STORAGE_KEY = 'dashboard.tourState';

interface DashboardTourState {
  viewTourComplete: boolean;
  editTourComplete: boolean;
  editTourState: EuiTourState;
}

const tourConfig: EuiTourState = {
  currentTourStep: FIRST_STEP,
  isTourActive: false,
  tourPopoverWidth: MAX_WIDTH,
  tourSubtitle: '',
};

const defaultTourState: DashboardTourState = {
  viewTourComplete: false,
  editTourComplete: false,
  editTourState: tourConfig,
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
    dashboardTourStateRef.current.editTourComplete = true;

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
    <DashboardTourContext.Provider value={contextValue}>
      {stepVisible && (
        <>
          {isViewTourActive ? (
            <EuiTourStep
              key={`view-step`}
              {...viewTourStep}
              isStepOpen={true}
              footerAction={<ViewTourFooter onFinishTour={finishViewTour} />}
            />
          ) : (
            <>
              {isEditTourActive &&
                !dashboardTourStateRef.current.editTourComplete &&
                editSteps.map((step) => (
                  <EuiTourStep
                    key={`edit-step-${step.step}-is-${String(step.isStepOpen)}`}
                    {...step}
                    footerAction={
                      <EditTourFooter
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
  );
};
