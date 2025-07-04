/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlertDeleteDescriptiveFormGroup } from './descriptive_form_group';
import * as i18n from '../translations';
import { httpServiceMock, notificationServiceMock } from '@kbn/core/public/mocks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();

jest.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => ({
  useUiSetting: jest.fn().mockImplementation((_, defaultValue) => defaultValue),
}));

describe('AlertDeleteRuleSettingsSection', () => {
  const lastRunDate = '2025-10-01T02:10:23.000Z';
  const mockHttpGet = ({ lastRun = lastRunDate, affectedAlertCount = 0 } = {}) => {
    http.get.mockClear();
    http.get.mockImplementation(async (path: any) => {
      if (path.includes('_last_run')) {
        return { last_run: lastRun };
      }
      throw new Error(`No mock implementation for path: ${path}`);
    });
  };

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        cacheTime: 0,
      },
    },
  });
  const servicesMock = { http, notifications };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <IntlProvider locale="en">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </IntlProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttpGet();
  });

  it('renders the described form group with the correct title and description', async () => {
    render(
      <AlertDeleteDescriptiveFormGroup services={servicesMock} categoryIds={['management']} />,
      {
        wrapper,
      }
    );
    await waitFor(() => {
      expect(screen.getByTestId('alert-delete-modal-loaded')).toBeInTheDocument();
    });
    expect(screen.getByText(i18n.RULE_SETTINGS_TITLE)).toBeInTheDocument();
    expect(screen.getByText(i18n.RULE_SETTINGS_DESCRIPTION)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: i18n.RUN_CLEANUP_TASK })).toBeInTheDocument();
  });

  it('opens the modal when the cleanup button is clicked', async () => {
    render(
      <AlertDeleteDescriptiveFormGroup services={servicesMock} categoryIds={['management']} />,
      {
        wrapper,
      }
    );
    fireEvent.click(await screen.findByTestId('alert-delete-open-modal-button'));
    expect(await screen.findByTestId('alert-delete-modal')).toBeInTheDocument();
  });
});
