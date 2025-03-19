/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { of } from 'rxjs';
import { SolutionsViewBadge } from './solutions_view_badge';
import { render } from '@testing-library/react';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

jest.mock('../../../../hooks/use_discover_services');

const useDiscoverServicesMock = useDiscoverServices as jest.Mock;

describe('SolutionsViewBadge', () => {
  test('renders badge', async () => {
    useDiscoverServicesMock.mockReturnValue({
      spaces: {
        getActiveSpace$: jest.fn().mockReturnValue(
          of({
            id: 'default',
            solution: 'classic',
          })
        ),
        isSolutionViewEnabled: true,
      },
      docLinks: { ELASTIC_WEBSITE_URL: 'https://www.elastic.co' },
      addBasePath: (path: string) => path,
      capabilities: { spaces: { manage: true } },
    });

    const { container, findByTitle, findByRole } = render(
      <IntlProvider locale="en">
        <SolutionsViewBadge badgeText="Toggle popover" />
      </IntlProvider>
    );
    expect(container).not.toBeEmptyDOMElement();

    const button = await findByTitle('Toggle popover');
    await button.click();
    const dialog = await findByRole('dialog');
    expect(dialog).not.toBeEmptyDOMElement();
  });

  test('does not render badge when active space is already configured to use a solution view other than "classic"', async () => {
    useDiscoverServicesMock.mockReturnValue({
      spaces: {
        getActiveSpace$: jest.fn().mockReturnValue(
          of({
            id: 'default',
            solution: 'oblt',
          })
        ),
        isSolutionViewEnabled: true,
      },
      docLinks: { ELASTIC_WEBSITE_URL: 'https://www.elastic.co' },
      addBasePath: (path: string) => path,
      capabilities: { spaces: { manage: true } },
    });

    const { container } = render(
      <IntlProvider locale="en">
        <SolutionsViewBadge badgeText="Toggle popover" />
      </IntlProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('does not render badge when spaces is disabled (no active space available)', async () => {
    useDiscoverServicesMock.mockReturnValue({
      spaces: {
        getActiveSpace$: jest.fn().mockReturnValue(of(undefined)),
        isSolutionViewEnabled: true,
      },
      docLinks: { ELASTIC_WEBSITE_URL: 'https://www.elastic.co' },
      addBasePath: (path: string) => path,
      capabilities: { spaces: { manage: true } },
    });

    const { container } = render(
      <IntlProvider locale="en">
        <SolutionsViewBadge badgeText="Toggle popover" />
      </IntlProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('does not render badge when solution visibility feature is disabled', async () => {
    useDiscoverServicesMock.mockReturnValue({
      spaces: {
        getActiveSpace$: jest.fn().mockReturnValue(
          of({
            id: 'default',
            solution: 'classic',
          })
        ),
        isSolutionViewEnabled: false,
      },
      docLinks: { ELASTIC_WEBSITE_URL: 'https://www.elastic.co' },
      addBasePath: (path: string) => path,
      capabilities: { spaces: { manage: true } },
    });

    const { container } = render(
      <IntlProvider locale="en">
        <SolutionsViewBadge badgeText="Toggle popover" />
      </IntlProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
