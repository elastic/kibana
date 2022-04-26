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

export const DASHBOARD_TOUR_STORAGE_KEY = 'dashboardTourState';

const dashboardTourConfig = {
  currentTourStep: 1,
  isTourActive: true,
  tourPopoverWidth: 360,
  tourSubtitle: 'Demo tour',
};

const dashboardTourSteps = [
  {
    anchor: '[data-test-subj="dashboardEditMode"]',
    step: 1,
    title: 'Step 1',
    content: <p>Click edit.</p>,
    anchorPosition: 'downCenter',
  } as EuiStatelessTourStep,
  {
    anchor: '[data-test-subj="dashboardAddNewPanelButton"]',
    step: 2,
    title: 'Step 2',
    content: <p>Save your changes.</p>,
    anchorPosition: 'rightCenter',
  } as EuiStatelessTourStep,
  {
    anchor: '.kbnQueryBar__datePickerWrapper',
    step: 3,
    title: 'Step 3',
    content: <p>Date picker</p>,
    anchorPosition: 'downCenter',
  } as EuiStatelessTourStep,
  {
    anchor: '[data-test-subj="dashboardPanelTitle__wrapper"]',
    step: 4,
    title: 'Step 4',
    content: <p>First lens panel</p>,
    anchorPosition: 'upCenter',
  } as EuiStatelessTourStep,
  {
    anchor: '[data-test-subj="dashboard-controls-menu-button"]',
    step: 5,
    title: 'Step 5',
    content: <p>Final.</p>,
    anchorPosition: 'upCenter',
  } as EuiStatelessTourStep,
];

export const DashboardTour = ({
  isEditMode,
  panelCount,
  firstLensPanelTitle,
}: {
  isEditMode: boolean;
  panelCount: number;
  firstLensPanelTitle?: string;
}) => {
  console.log('ID:', firstLensPanelTitle);
  dashboardTourSteps[3].anchor = `[data-test-subj="embeddablePanelHeading-${(
    firstLensPanelTitle || ''
  ).replace(/\s/g, '')}"]`;

  const initialState = localStorage.getItem(DASHBOARD_TOUR_STORAGE_KEY);
  let tourState: EuiTourState;
  if (initialState) {
    tourState = JSON.parse(initialState);
  } else {
    tourState = dashboardTourConfig;
  }
  if (isEditMode && tourState.currentTourStep < 2) {
    tourState.currentTourStep = 2;
  }

  const [
    [euiTourStepOne, euiTourStepTwo, euiTourStepThree, euiTourStepFour, euiTourStepFive],
    actions,
    reducerState,
  ] = useEuiTour(dashboardTourSteps, tourState);

  if (isEditMode && reducerState.currentTourStep < 2) {
    actions.goToStep(2);
  }

  // console.log('tourState:', tourState);
  // console.log('Reducer state:', reducerState);

  useEffect(() => {
    localStorage.setItem(DASHBOARD_TOUR_STORAGE_KEY, JSON.stringify(reducerState));
  }, [reducerState]);

  // const clickButtonByTestSubject = (testSubject: string) => {
  //   $(`[data-test-subj="${testSubject}"]`).trigger('click');
  // };

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
        <EuiTourStep {...euiTourStepTwo} footerAction={<CustomFooter />} />
        <EuiTourStep {...euiTourStepThree} footerAction={<CustomFooter />} />
        <EuiTourStep {...euiTourStepFour} footerAction={<CustomFooter />} />
        <EuiTourStep {...euiTourStepFive} />
      </>
    );
  };

  return <TourSteps />;
};
