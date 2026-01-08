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
import { getStatusText, StatusIndicator } from './status';
import { LocaleWrapper } from '../__mocks__';
import { SearchSessionStatus } from '../../../../../common';
import userEvent from '@testing-library/user-event';

let tz: string;
let session: UISession;

const MOCK_NOW_TIME = new Date();
MOCK_NOW_TIME.setTime(1607026176061);

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

  describe('getStatusText', () => {
    test('in progress', () => {
      expect(getStatusText(SearchSessionStatus.IN_PROGRESS)).toBe('In progress');
    });

    test('expired', () => {
      expect(getStatusText(SearchSessionStatus.EXPIRED)).toBe('Expired');
    });

    test('cancelled', () => {
      expect(getStatusText(SearchSessionStatus.CANCELLED)).toBe('Cancelled');
    });

    test('complete', () => {
      expect(getStatusText(SearchSessionStatus.COMPLETE)).toBe('Complete');
    });

    test('error', () => {
      expect(getStatusText(SearchSessionStatus.ERROR)).toBe('Error');
    });
  });

  describe('StatusIndicator', () => {
    test('render in progress', () => {
      render(
        <LocaleWrapper>
          <StatusIndicator session={session} timezone={tz} />
        </LocaleWrapper>
      );

      expect(screen.getByText('In progress')).toBeVisible();
    });

    test('complete', () => {
      session.status = SearchSessionStatus.COMPLETE;

      render(
        <LocaleWrapper>
          <StatusIndicator session={session} timezone={tz} />
        </LocaleWrapper>
      );

      expect(screen.getByText('Complete')).toBeVisible();
    });

    test('complete - expires soon', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
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
      jest.useRealTimers();
    });

    test('expired', () => {
      session.status = SearchSessionStatus.EXPIRED;

      render(
        <LocaleWrapper>
          <StatusIndicator now={MOCK_NOW_TIME.toISOString()} session={session} timezone={tz} />
        </LocaleWrapper>
      );

      expect(screen.getByText('Expired')).toBeVisible();
    });

    test('error', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
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
      jest.useRealTimers();
    });

    test('error handling', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
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
      jest.useRealTimers();
    });
  });
});
