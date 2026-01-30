/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UISession } from '../types';
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { LocaleWrapper } from '../__mocks__';
import { SearchSessionStatus } from '../../../../../common';
import { StatusIndicator } from './status';
import userEvent from '@testing-library/user-event';

let tz: string;
let session: UISession;

const MOCK_NOW_TIME = new Date(1607026176061);

const TEST_CASES = [
  { status: SearchSessionStatus.IN_PROGRESS, expectedText: 'In progress' },
  { status: SearchSessionStatus.EXPIRED, expectedText: 'Expired' },
  { status: SearchSessionStatus.CANCELLED, expectedText: 'Cancelled' },
  { status: SearchSessionStatus.COMPLETE, expectedText: 'Complete' },
  { status: SearchSessionStatus.ERROR, expectedText: 'Error' },
];

describe('Background Search Session management status labels', () => {
  beforeEach(() => {
    tz = 'Browser';
    session = {
      name: 'amazing test',
      id: 'wtywp9u2802hahgp-gsla',
      restoreUrl: '/app/great-app-url/#45',
      reloadUrl: '/app/great-app-url/#45',
      numSearches: 1,
      appId: 'security',
      status: SearchSessionStatus.IN_PROGRESS,
      created: '2020-12-02T00:19:32Z',
      expires: '2020-12-07T00:19:32Z',
      initialState: {},
      restoreState: {},
      version: '8.0.0',
      idMapping: {},
    };
  });

  describe('StatusIndicator', () => {
    test.each(TEST_CASES)('renders $status', ({ status, expectedText }) => {
      session.status = status;

      render(
        <LocaleWrapper>
          <StatusIndicator session={session} timezone={tz} />
        </LocaleWrapper>
      );

      expect(screen.getByText(expectedText)).toBeVisible();
    });

    describe('when the user hovers the indicator', () => {
      beforeAll(() => {
        jest.useFakeTimers();
      });

      afterAll(() => {
        jest.useRealTimers();
      });

      const setupUser = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      test('complete - expires soon', async () => {
        const user = setupUser();
        session.status = SearchSessionStatus.COMPLETE;

        render(
          <LocaleWrapper>
            <StatusIndicator session={session} timezone={tz} />
          </LocaleWrapper>
        );

        await user.hover(screen.getByText('Complete'));
        act(() => {
          jest.advanceTimersByTime(300);
        });

        expect(await screen.findByText(/Expires on/i)).toBeVisible();
      });

      test('error', async () => {
        const user = setupUser();
        session.status = SearchSessionStatus.ERROR;

        render(
          <LocaleWrapper>
            <StatusIndicator
              now={MOCK_NOW_TIME.toISOString()}
              session={{ ...session, errors: ['an error'] }}
              timezone={tz}
            />
          </LocaleWrapper>
        );

        await user.hover(screen.getByText('Error'));
        act(() => {
          jest.advanceTimersByTime(300);
        });

        expect(
          await screen.findByText(
            /One or more searches failed to complete. Use the "Inspect" action to see the underlying errors./i
          )
        ).toBeVisible();
      });

      test('error handling', async () => {
        const user = setupUser();
        session.status = SearchSessionStatus.COMPLETE;
        (session as any).created = null;
        (session as any).expires = null;

        render(
          <LocaleWrapper>
            <StatusIndicator now={MOCK_NOW_TIME.toISOString()} session={session} timezone={tz} />
          </LocaleWrapper>
        );

        await user.hover(screen.getByText('Complete'));
        act(() => {
          jest.advanceTimersByTime(300);
        });

        expect(await screen.findByText(/Expires on unknown/i)).toBeVisible();
      });
    });
  });
});
