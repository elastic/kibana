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
import { CustomFooter } from './custom_footer';

export const DASHBOARD_EDIT_TOUR_STORAGE_KEY = 'dashboardEditTourState';
const TOUR_POPOVER_WIDTH = 360;

const dashboardEditTourConfig = {
  currentTourStep: 1,
  isTourActive: true,
  tourPopoverWidth: 360,
  tourSubtitle: 'Dashboard tour',
};

const dashboardEditTourSteps = [
  {
    anchor: '[data-test-subj="dashboardAddNewPanelButton"]',
    step: 1,
    title: 'Visualizations',
    content: (
      <p>
        Create and add your own visualizations by clicking <b>Create visualization</b>.
      </p>
    ),
    anchorPosition: 'rightCenter',
    maxWidth: TOUR_POPOVER_WIDTH,
  } as EuiStatelessTourStep,
  {
    anchor: '[data-test-subj="embeddablePanelToggleMenuIcon"]',
    step: 2,
    title: 'Customize visualizations',
    content: <p>Click the gear icon to customize your visualizations.</p>,
    anchorPosition: 'upCenter',
    maxWidth: TOUR_POPOVER_WIDTH,
  } as EuiStatelessTourStep,
  {
    anchor: '.kbnQueryBar__datePickerWrapper',
    step: 3,
    title: 'Expand the time range',
    content: <p>Use the time filter to display the dashboard data you want to analyze.</p>,
    anchorPosition: 'downCenter',
    maxWidth: TOUR_POPOVER_WIDTH,
  } as EuiStatelessTourStep,
  {
    anchor: '#addFilterPopover',
    step: 4,
    title: 'Filter the data',
    content: (
      <p>Filter the dashboard data by clicking the visualization data or add a global filter.</p>
    ),
    anchorPosition: 'downCenter',
    maxWidth: TOUR_POPOVER_WIDTH,
  } as EuiStatelessTourStep,
  {
    anchor: '[data-test-subj="dashboard-controls-menu-button"]',
    step: 5,
    title: 'Controls',
    content: <p>Interact with your dashboard data by creating and adding Controls.</p>,
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

  // const BlockUntilPanelAddedFooter = () => (
  //   <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
  //     <EuiFlexItem grow={false}>
  //       <EuiButtonEmpty color="text" size="xs" onClick={() => actions.finishTour()}>
  //         Skip tour
  //       </EuiButtonEmpty>
  //     </EuiFlexItem>
  //     <EuiFlexItem grow={false}>
  //       <EuiButton
  //         size="s"
  //         isDisabled={panelCount > 0 ? false : true}
  //         color="success"
  //         onClick={() => actions.incrementStep()}
  //       >
  //         Next
  //       </EuiButton>
  //     </EuiFlexItem>
  //   </EuiFlexGroup>
  // );

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
