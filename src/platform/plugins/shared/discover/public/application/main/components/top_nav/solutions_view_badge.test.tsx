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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

jest.mock('../../../../hooks/use_discover_services');
const useDiscoverServicesMock = jest.mocked(useDiscoverServices);

const mockUseDiscoverServicesMock = ({
  getActiveSpaceReturn,
  isSolutionViewEnabled,
}: {
  getActiveSpaceReturn: object | undefined;
  isSolutionViewEnabled: boolean;
}) => {
  useDiscoverServicesMock.mockReturnValue({
    spaces: {
      getActiveSpace$: jest.fn().mockReturnValue(of(getActiveSpaceReturn)),
      isSolutionViewEnabled,
    },
    docLinks: {
      ELASTIC_WEBSITE_URL: 'https://www.elastic.co',
    },
    addBasePath: (path: string) => path,
    capabilities: { spaces: { manage: true } },
  } as unknown as ReturnType<typeof useDiscoverServices>);
};

const setup = () => {
  const user = userEvent.setup();

  const { container } = render(
    <IntlProvider locale="en">
      <SolutionsViewBadge badgeText="Toggle popover" />
    </IntlProvider>
  );

  return { container, user };
};

describe('SolutionsViewBadge', () => {
  test('renders badge', async () => {
    // Given
    mockUseDiscoverServicesMock({
      getActiveSpaceReturn: {
        id: 'default',
        solution: 'classic',
      },
      isSolutionViewEnabled: true,
    });

    // When
    const { container, user } = setup();

    // Then
    expect(container).not.toBeEmptyDOMElement();

    const button = await screen.findByTitle('Toggle popover');
    await user.click(button);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).not.toBeEmptyDOMElement();
  });

  test('does not render badge when active space is already configured to use a solution view other than "classic"', async () => {
    // Given
    mockUseDiscoverServicesMock({
      getActiveSpaceReturn: {
        id: 'default',
        solution: 'oblt',
      },
      isSolutionViewEnabled: true,
    });

    // When
    const { container } = setup();

    // Then
    expect(container).toBeEmptyDOMElement();
  });

  test('does not render badge when spaces is disabled (no active space available)', async () => {
    // Given
    mockUseDiscoverServicesMock({
      getActiveSpaceReturn: undefined,
      isSolutionViewEnabled: true,
    });

    // When
    const { container } = setup();

    // Then
    expect(container).toBeEmptyDOMElement();
  });

  test('does not render badge when solution visibility feature is disabled', async () => {
    // Given
    mockUseDiscoverServicesMock({
      getActiveSpaceReturn: {
        id: 'default',
        solution: 'classic',
      },
      isSolutionViewEnabled: false,
    });

    // When
    const { container } = setup();

    // Then
    expect(container).toBeEmptyDOMElement();
  });
});
