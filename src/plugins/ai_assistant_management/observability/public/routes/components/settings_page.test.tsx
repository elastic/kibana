/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { useAppContext } from '../../hooks/use_app_context';
import { coreStart, render } from '../../helpers/test_helper';
import { SettingsPage } from './settings_page';

jest.mock('../../hooks/use_app_context');

const useAppContextMock = useAppContext as jest.Mock;

const setBreadcrumbs = jest.fn();
const navigateToApp = jest.fn();

describe('Settings Page', () => {
  beforeEach(() => {
    useAppContextMock.mockReturnValue({
      observabilityAIAssistant: {
        useGenAIConnectors: () => ({ connectors: [] }),
      },
      setBreadcrumbs,
      application: { navigateToApp },
    });
  });

  it('should navigate to home when not authorized', () => {
    render(<SettingsPage />, { show: false });

    expect(coreStart.application.navigateToApp).toBeCalledWith('home');
  });

  it('should render settings and knowledge base tabs', () => {
    const { getByTestId } = render(<SettingsPage />);

    expect(getByTestId('settingsPageTab-settings')).toBeInTheDocument();
    expect(getByTestId('settingsPageTab-knowledge_base')).toBeInTheDocument();
  });

  it('should set breadcrumbs', () => {
    render(<SettingsPage />);

    expect(setBreadcrumbs).toHaveBeenCalledWith([
      {
        text: 'AI Assistants',
        onClick: expect.any(Function),
      },
      {
        text: 'Observability',
      },
    ]);
  });
});
