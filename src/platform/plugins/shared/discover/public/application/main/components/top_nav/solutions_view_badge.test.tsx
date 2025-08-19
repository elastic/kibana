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
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';

jest.mock('../../../../hooks/use_discover_services');
const useDiscoverServicesMock = jest.mocked(useDiscoverServices);

const mockUseDiscoverServicesMock = ({
  getActiveSpaceReturn,
  isSolutionViewEnabled,
  canManageSpaces = true,
}: {
  getActiveSpaceReturn: object | undefined;
  isSolutionViewEnabled: boolean;
  canManageSpaces?: boolean;
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
    capabilities: { spaces: { manage: canManageSpaces } },
  } as unknown as ReturnType<typeof useDiscoverServices>);
};

const setup = () => {
  const user = userEvent.setup();

  const { container } = render(
    <DiscoverTestProvider>
      <SolutionsViewBadge badgeText="Toggle popover" />
    </DiscoverTestProvider>
  );

  return { container, user };
};

describe('SolutionsViewBadge', () => {
  describe('when the solution visibility feature is disabled', () => {
    it('does not render the badge', () => {
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

  describe('when spaces is disabled (no active space available)', () => {
    it('does not render the badge', () => {
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
  });

  describe('when there is an active space', () => {
    describe('when the active space is configured to use a solution view other than "classic"', () => {
      it('does not render the badge', () => {
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
    });

    describe('when the active space is configured to use the classic solution view', () => {
      it('renders the badge', () => {
        // Given
        mockUseDiscoverServicesMock({
          getActiveSpaceReturn: {
            id: 'default',
            solution: 'classic',
          },
          isSolutionViewEnabled: true,
          canManageSpaces: false,
        });

        // When
        setup();

        // Then
        expect(screen.getByText('Toggle popover')).toBeVisible();
      });

      describe('when the user clicks the badge', () => {
        describe('and the user has manage spaces capability', () => {
          it('opens the popover', async () => {
            // Given
            mockUseDiscoverServicesMock({
              getActiveSpaceReturn: {
                id: 'default',
                solution: 'classic',
              },
              isSolutionViewEnabled: true,
              canManageSpaces: true,
            });

            // When
            const { user } = setup();

            // Then
            await user.click(screen.getByTitle('Toggle popover'));

            const dialog = screen.getByRole('dialog');
            await waitFor(() =>
              expect(
                within(dialog).getByText(
                  `We improved Discover so your view adapts to what you're exploring. Choose Observability or Security as your “solution view” in your space settings.`
                )
              ).toBeVisible()
            );
          });
        });

        describe('and the user does not have manage spaces capability', () => {
          it('opens the popover', async () => {
            // Given
            mockUseDiscoverServicesMock({
              getActiveSpaceReturn: {
                id: 'default',
                solution: 'classic',
              },
              isSolutionViewEnabled: true,
              canManageSpaces: false,
            });

            // When
            const { user } = setup();

            // Then
            await user.click(screen.getByTitle('Toggle popover'));

            const dialog = screen.getByRole('dialog');
            await waitFor(() =>
              expect(
                within(dialog).getByText(
                  `We enhanced Discover to adapt seamlessly to what you're exploring. Select Observability or Security as the “solution view” — ask your admin to set it in the space settings.`
                )
              ).toBeVisible()
            );
          });
        });
      });
    });
  });
});
