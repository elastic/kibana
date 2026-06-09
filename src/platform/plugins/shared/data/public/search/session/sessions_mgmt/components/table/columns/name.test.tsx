/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSearchUsageCollectorMock } from '../../../../../collectors/mocks';
import { nameColumn } from './name';
import { render, screen } from '@testing-library/react';
import { getUiSessionMock } from '../../../__mocks__';
import { SearchSessionStatus } from '../../../../../../../common';
import type { UISession } from '../../../types';
import userEvent from '@testing-library/user-event';

const setup = ({
  kibanaVersion = '9.0.0',
  uiSession = getUiSessionMock(),
  onBackgroundSearchOpened,
}: {
  kibanaVersion?: string;
  uiSession?: UISession;
  onBackgroundSearchOpened?: jest.Mock;
} = {}) => {
  const user = userEvent.setup();
  const searchUsageCollector = createSearchUsageCollectorMock();
  const navigateToUrl = jest.fn();

  const column = nameColumn({
    searchUsageCollector,
    kibanaVersion,
    navigateToUrl,
    onBackgroundSearchOpened,
  });

  if (!('render' in column) || !column.render) throw Error('Column is not valid');

  render(column.render(uiSession.name, uiSession));

  return { searchUsageCollector, kibanaVersion, navigateToUrl, onBackgroundSearchOpened, user };
};

describe('name column', () => {
  describe('when the session is in progress', () => {
    it('should render the name as plain text', () => {
      // Given
      const mockSession = getUiSessionMock({ status: SearchSessionStatus.IN_PROGRESS });

      // When
      setup({ uiSession: mockSession });

      // Then
      expect(screen.getByTestId('sessionManagementNameText')).toBeVisible();
      expect(screen.getByText(mockSession.name)).toBeVisible();
    });
  });

  describe('when the session is NOT in progress', () => {
    describe('when the session name is clicked', () => {
      it('should navigate in app', async () => {
        // Given
        const mockSession = getUiSessionMock({ status: SearchSessionStatus.COMPLETE });

        // When
        const { user, navigateToUrl } = setup({ uiSession: mockSession });
        await user.click(screen.getByText(mockSession.name));

        // Then
        expect(screen.getByTestId('sessionManagementNameLink')).toBeVisible();
        expect(navigateToUrl).toHaveBeenCalledWith(mockSession.restoreUrl);
      });

      it('should call onBackgroundSearchOpened', async () => {
        // Given
        const mockSession = getUiSessionMock({ status: SearchSessionStatus.COMPLETE });
        const onBackgroundSearchOpened = jest.fn();

        // When
        const { user } = setup({ uiSession: mockSession, onBackgroundSearchOpened });
        await user.click(screen.getByText(mockSession.name));

        // Then
        expect(onBackgroundSearchOpened).toHaveBeenCalledWith({
          event: expect.any(Object),
          session: mockSession,
        });
        expect(onBackgroundSearchOpened.mock.calls[0][0].event.defaultPrevented).toBe(true);
      });
    });
  });

  describe('when the session is from an older version', () => {
    const kibanaVersion = '7.14.0';
    const sessionVersion = '7.13.0';

    describe.each([SearchSessionStatus.IN_PROGRESS, SearchSessionStatus.COMPLETE])(
      'when status is %s',
      (status) => {
        it('should render a warning', () => {
          // Given
          const mockSession = getUiSessionMock({
            version: sessionVersion,
            status,
          });

          // When
          setup({ kibanaVersion, uiSession: mockSession });

          // Then
          expect(screen.getByTestId('versionIncompatibleWarningTestSubj')).toBeVisible();
        });
      }
    );

    describe.each([
      SearchSessionStatus.CANCELLED,
      SearchSessionStatus.ERROR,
      SearchSessionStatus.EXPIRED,
    ])('when status is %s', (status) => {
      it('should NOT render a warning', () => {
        // Given
        const mockSession = getUiSessionMock({
          version: sessionVersion,
          status,
        });

        // When
        setup({ uiSession: mockSession, kibanaVersion });

        // Then
        expect(screen.queryByTestId('versionIncompatibleWarningTestSubj')).not.toBeInTheDocument();
      });
    });
  });

  describe('when the session is from the same version', () => {
    const version = '7.15.0';

    describe.each([
      SearchSessionStatus.IN_PROGRESS,
      SearchSessionStatus.COMPLETE,
      SearchSessionStatus.CANCELLED,
      SearchSessionStatus.ERROR,
      SearchSessionStatus.EXPIRED,
    ])('when status is %s', (status) => {
      it('should NOT render a warning', () => {
        // Given
        const mockSession = getUiSessionMock({
          version,
          status,
        });

        // When
        setup({ kibanaVersion: version, uiSession: mockSession });

        // Then
        expect(screen.queryByTestId('versionIncompatibleWarningTestSubj')).not.toBeInTheDocument();
      });
    });
  });
});
