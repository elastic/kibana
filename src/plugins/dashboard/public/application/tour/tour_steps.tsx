/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiTourStepProps, EuiText } from '@elastic/eui';
import { DashboardTourStrings } from './translations';

export const MAX_WIDTH = 350;
export const FIRST_STEP = 1;

interface TourStepDefinition {
  anchor: EuiTourStepProps['anchor'];
  title: EuiTourStepProps['title'];
  content: EuiTourStepProps['content'];
  anchorPosition: EuiTourStepProps['anchorPosition'];
}

export const viewTourStepDefinitions: TourStepDefinition[] = [
  {
    anchor: '[data-test-subj="dashboardEditMode"]',
    title: DashboardTourStrings.viewModeTour.getTitle(),
    content: <EuiText>{DashboardTourStrings.viewModeTour.getDescription()}</EuiText>,
    anchorPosition: 'downCenter',
  },
];

export const editTourStepDefinitions: TourStepDefinition[] = [
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

export const prepareTourSteps = (stepDefinitions: TourStepDefinition[]): EuiTourStepProps[] =>
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

export const findNextAvailableStep = (
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
