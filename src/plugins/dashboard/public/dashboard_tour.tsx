/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiStatelessTourStep,
  EuiTourState,
  EuiTourStep,
  useEuiTour,
} from '@elastic/eui';
import React, { useEffect } from 'react';

export const DASHBOARD_TOUR_STORAGE_KEY = 'controlsTourState';

const dashboardTourConfig = {
  currentTourStep: 1,
  isTourActive: false,
  tourPopoverWidth: 360,
  tourSubtitle: 'Demo tour',
};

const dashboardTourSteps = [
  {
    anchor: '[data-test-subj="dashboardEditMode"]',
    step: 1,
    title: 'Step 1',
    content: 'Click edit',
    anchorPosition: 'rightUp',
  } as EuiStatelessTourStep,
  {
    anchor: '[data-test-subj="controls-create-button"]',
    step: 2,
    title: 'Step 2',
    content: <p>Save your changes.</p>,
    anchorPosition: 'rightCenter',
  } as EuiStatelessTourStep,
  {
    anchor: '#control-editor-types',
    step: 3,
    title: 'Step 3',
    content: <p>Final.</p>,
    anchorPosition: 'upCenter',
  } as EuiStatelessTourStep,
];

export const DashboardTour = ({ isEditMode }: { isEditMode: boolean }) => {
  const initialState = localStorage.getItem(DASHBOARD_TOUR_STORAGE_KEY);
  let tourState: EuiTourState;
  if (initialState) {
    tourState = JSON.parse(initialState);
  } else {
    tourState = dashboardTourConfig;
  }
  tourState = { ...tourState, isTourActive: true, currentTourStep: isEditMode ? 2 : 1 };

  console.log('tourState:', tourState);
  const [[euiTourStepOne, euiTourStepTwo, euiTourStepThree], actions, reducerState] = useEuiTour(
    dashboardTourSteps,
    tourState
  );
  console.log('Reducer state:', reducerState);

  useEffect(() => {
    localStorage.setItem(DASHBOARD_TOUR_STORAGE_KEY, JSON.stringify(reducerState));
  }, [reducerState]);

  const clickButtonByTestSubject = (testSubject: string) => {
    $(`[data-test-subj="${testSubject}"]`).trigger('click');
  };

  const CustomFooter = ({ customNext }: { customNext?: () => void }) => {
    return (
      <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty color="text" size="xs" onClick={() => actions.finishTour()}>
            Skip tour
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            color="success"
            onClick={() => {
              customNext?.();
              actions.incrementStep();
            }}
          >
            Next
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const TourSteps = () => {
    return (
      <>
        <EuiTourStep {...euiTourStepOne} />
        <EuiTourStep
          {...euiTourStepTwo}
          footerAction={
            <CustomFooter customNext={() => clickButtonByTestSubject('controls-create-button')} />
          }
        />
        <EuiTourStep {...euiTourStepThree} />
      </>
    );
  };

  return <TourSteps />;
};
