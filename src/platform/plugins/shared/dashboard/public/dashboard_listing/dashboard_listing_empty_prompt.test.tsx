/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';

import { coreServices } from '../services/kibana_services';
import { confirmDiscardUnsavedChanges } from './confirm_overlays';
import {
  DashboardListingEmptyPrompt,
  DashboardListingEmptyPromptProps,
} from './dashboard_listing_empty_prompt';

jest.mock('./confirm_overlays', () => {
  const originalModule = jest.requireActual('./confirm_overlays');
  return {
    __esModule: true,
    ...originalModule,
    confirmDiscardUnsavedChanges: jest.fn(),
  };
});

const renderDashboardListingEmptyPrompt = (props: Partial<DashboardListingEmptyPromptProps> = {}) =>
  render(
    <DashboardListingEmptyPrompt
      createItem={jest.fn()}
      goToDashboard={jest.fn()}
      setUnsavedDashboardIds={jest.fn()}
      unsavedDashboardIds={[]}
      useSessionStorageIntegration={true}
      disableCreateDashboardButton={false}
      {...props}
    />,
    { wrapper: I18nProvider }
  );

test.each([
  [false, false],
  [true, true],
])(
  'renders sample data link empty prompt with link when showWriteControls is true only',
  async (showWriteControls, shouldBeInDocument) => {
    (coreServices.application.capabilities as any).dashboard_v2.showWriteControls =
      showWriteControls;
    renderDashboardListingEmptyPrompt();
    const button = screen.queryByRole('button', { name: /add some sample data/i });
    if (shouldBeInDocument) {
      expect(button).toBeInTheDocument();
    } else {
      expect(button).not.toBeInTheDocument();
    }
  }
);

test('renders disabled action button when disableCreateDashboardButton is true', async () => {
  (coreServices.application.capabilities as any).dashboard_v2.showWriteControls = true;
  renderDashboardListingEmptyPrompt({ disableCreateDashboardButton: true });
  expect(screen.getByTestId('newItemButton')).toBeDisabled();
});

test('renders continue button when no dashboards exist but one is in progress', async () => {
  (coreServices.application.capabilities as any).dashboard_v2.showWriteControls = true;

  const props = {
    goToDashboard: jest.fn(),
    unsavedDashboardIds: ['newDashboard'],
    useSessionStorageIntegration: true,
  };

  renderDashboardListingEmptyPrompt(props);

  // EuiButton is rendered as a button with text "Continue editing"
  const continueButton = screen.getByRole('button', { name: /continue editing/i });
  await userEvent.click(continueButton);

  expect(props.goToDashboard).toHaveBeenCalled();
});

test('renders discard button when no dashboards exist but one is in progress', async () => {
  (coreServices.application.capabilities as any).dashboard_v2.showWriteControls = true;

  renderDashboardListingEmptyPrompt({
    unsavedDashboardIds: ['coolId'],
    useSessionStorageIntegration: true,
  });

  const discardButton = screen.getByRole('button', { name: /reset changes/i });
  await userEvent.click(discardButton);

  expect(confirmDiscardUnsavedChanges).toHaveBeenCalled();
});
