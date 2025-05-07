/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertDeleteDescriptiveFormGroup } from './descriptive_form_group';
import * as i18n from '../translations';
import { httpServiceMock, notificationServiceMock } from '@kbn/core/public/mocks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();

describe('AlertDeleteRuleSettingsSection', () => {
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

  it('renders the described form group with the correct title and description', () => {
    render(
      <AlertDeleteDescriptiveFormGroup services={servicesMock} categoryIds={['management']} />,
      {
        wrapper,
      }
    );
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
