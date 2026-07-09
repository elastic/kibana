/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { of } from 'rxjs';
import type { Template } from '@kbn/workflows-library';
import { LibraryCatalogBrowserPage } from './catalog_browser_page';
import { WorkflowsDeepLinks } from '../../deep_links';
import { createStartServicesMock, type StartServicesMock } from '../../mocks';
import { getTestProvider } from '../../shared/mocks/test_providers';

// The page redirects away unless the library tech-preview global uiSetting is on.
function buildEnabledServices(): StartServicesMock {
  const services = createStartServicesMock();
  services.settings.globalClient.get.mockReturnValue(true);
  services.settings.globalClient.get$.mockReturnValue(of(true));
  return services;
}

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  CatalogBrowser: ({ onSelect }: { onSelect: (template: Template) => void }) => (
    <button
      type="button"
      data-test-subj="mockCatalogBrowserSelectButton"
      onClick={() => onSelect({ slug: 'ip-reputation-check' } as Template)}
    >
      {'Select'}
    </button>
  ),
}));

jest.mock('../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs', () => ({
  useWorkflowsBreadcrumbs: jest.fn(),
}));

describe('LibraryCatalogBrowserPage', () => {
  it('renders the catalog browser when the library is enabled', () => {
    const services = buildEnabledServices();

    render(<LibraryCatalogBrowserPage />, { wrapper: getTestProvider({ services }) });

    expect(screen.getByTestId('mockCatalogBrowserSelectButton')).toBeInTheDocument();
  });

  it('navigates to the template detail route via the library deep link when a template is selected', () => {
    const services = buildEnabledServices();

    render(<LibraryCatalogBrowserPage />, { wrapper: getTestProvider({ services }) });
    fireEvent.click(screen.getByTestId('mockCatalogBrowserSelectButton'));

    expect(services.application.navigateToApp).toHaveBeenCalledWith('workflows', {
      deepLinkId: WorkflowsDeepLinks.library,
      path: 'ip-reputation-check',
    });
  });
});
