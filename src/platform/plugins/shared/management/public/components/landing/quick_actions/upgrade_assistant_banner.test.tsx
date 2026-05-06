/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { UpgradeAssistantBanner } from './upgrade_assistant_banner';

describe('UpgradeAssistantBanner', () => {
  const navigateToApp = jest.fn();

  afterEach(() => {
    navigateToApp.mockClear();
  });

  it('renders nothing while loading', () => {
    const http = {
      get: jest.fn().mockReturnValue(new Promise(() => {})),
    };

    const { container } = render(
      <I18nProvider>
        <UpgradeAssistantBanner http={http as any} navigateToApp={navigateToApp} />
      </I18nProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there are no deprecations', async () => {
    const http = {
      get: jest.fn().mockResolvedValue({ totalCriticalDeprecations: 0 }),
    };

    const { container } = render(
      <I18nProvider>
        <UpgradeAssistantBanner http={http as any} navigateToApp={navigateToApp} />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(http.get).toHaveBeenCalled();
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('renders banner when deprecations exist', async () => {
    const http = {
      get: jest.fn().mockResolvedValue({ totalCriticalDeprecations: 3 }),
    };

    render(
      <I18nProvider>
        <UpgradeAssistantBanner http={http as any} navigateToApp={navigateToApp} />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('managementUpgradeAssistantBanner')).toBeInTheDocument();
    });

    expect(screen.getByTestId('managementUpgradeAssistantBanner')).toHaveTextContent(
      '3 deprecation warnings'
    );
  });

  it('renders nothing when API call fails', async () => {
    const http = {
      get: jest.fn().mockRejectedValue(new Error('not found')),
    };

    const { container } = render(
      <I18nProvider>
        <UpgradeAssistantBanner http={http as any} navigateToApp={navigateToApp} />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(http.get).toHaveBeenCalled();
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('navigates to upgrade assistant on link click', async () => {
    const http = {
      get: jest.fn().mockResolvedValue({ totalCriticalDeprecations: 2 }),
    };

    render(
      <I18nProvider>
        <UpgradeAssistantBanner http={http as any} navigateToApp={navigateToApp} />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('managementUpgradeAssistantLink')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('managementUpgradeAssistantLink'));
    expect(navigateToApp).toHaveBeenCalledWith('management', {
      path: 'stack/upgrade_assistant',
    });
  });
});
