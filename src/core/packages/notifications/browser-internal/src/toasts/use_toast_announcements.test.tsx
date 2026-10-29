/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { act, render, screen } from '@testing-library/react';
import type { ScreenReaderNotifyOptions, Toast } from '@kbn/core-notifications-browser';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import type { AnnouncementMessage } from '../screen_reader/announcement_queue';
import { ToastsTelemetry } from './telemetry';
import { GlobalToastList } from './global_toast_list';

const toastsTelemetry = new ToastsTelemetry();
toastsTelemetry.setup({ analytics: analyticsServiceMock.createAnalyticsServiceSetup() });

const renderToastList = () => {
  const toasts$ = new BehaviorSubject<Toast[]>([]);
  const notifyScreenReader = jest.fn<void, [AnnouncementMessage, ScreenReaderNotifyOptions?]>();

  render(
    <GlobalToastList
      toasts$={toasts$}
      dismissToast={jest.fn()}
      reportEvent={toastsTelemetry.start({
        analytics: analyticsServiceMock.createAnalyticsServiceStart(),
      })}
      notifyScreenReader={notifyScreenReader}
    />
  );

  const addToast = (toast: Toast) => act(() => toasts$.next([...toasts$.getValue(), toast]));
  const dismissToast = (toastId: string) =>
    act(() => toasts$.next(toasts$.getValue().filter(({ id }) => id !== toastId)));
  // Resolves messages like the screen reader queue does when it announces them
  const getAnnouncements = () =>
    notifyScreenReader.mock.calls.map(([message]) =>
      typeof message === 'function' ? message() : message
    );

  return { addToast, dismissToast, getAnnouncements, notifyScreenReader };
};

describe('toast announcements', () => {
  it('disables the live region of the visual toast list to avoid duplicate announcements', () => {
    renderToastList();

    expect(screen.getByTestId('globalToastList').getAttribute('aria-live')).toBe('off');
  });

  it.each([
    ['success', 'Success: Saved field. All good'],
    ['warning', 'Warning: Saved field. All good'],
    ['danger', 'Error: Saved field. All good'],
    ['primary', 'Notification: Saved field. All good'],
    [undefined, 'Notification: Saved field. All good'],
  ] as const)('announces a new %s toast with its type, title and text', (color, expected) => {
    const { addToast, getAnnouncements, notifyScreenReader } = renderToastList();

    addToast({ id: '1', title: 'Saved field', text: 'All good', color });

    expect(getAnnouncements()).toEqual([expected]);
    expect(notifyScreenReader).toHaveBeenCalledWith(expect.any(Function), {
      politeness: 'assertive',
    });
  });

  it('announces the rendered text of mount point content', () => {
    const { addToast, getAnnouncements } = renderToastList();

    addToast({
      id: '1',
      title: 'Error deleting synonyms set',
      text: (element) => {
        element.textContent = 'Request failed with status 500';
        return () => {};
      },
      color: 'danger',
    });

    expect(getAnnouncements()).toEqual([
      'Error: Error deleting synonyms set. Request failed with status 500',
    ]);
  });

  it('skips a toast that was dismissed before it was announced', () => {
    const { addToast, dismissToast, getAnnouncements } = renderToastList();

    addToast({ id: '1', title: 'Gone already', color: 'success' });
    dismissToast('1');

    // An empty message is skipped by the screen reader queue
    expect(getAnnouncements()).toEqual(['']);
  });

  it('announces a repeated toast that is grouped with an existing one', () => {
    const { addToast, getAnnouncements } = renderToastList();

    addToast({ id: '1', title: 'Saved', color: 'success' });
    addToast({ id: '2', title: 'Saved', color: 'success' });

    expect(getAnnouncements()).toEqual(['Success: Saved', 'Success: Saved']);
  });

  it('does not announce existing toasts again when another toast is dismissed', () => {
    const { addToast, dismissToast, getAnnouncements } = renderToastList();

    addToast({ id: '1', title: 'First', color: 'success' });
    addToast({ id: '2', title: 'Second', color: 'success' });
    const announcementCount = getAnnouncements().length;

    dismissToast('1');

    expect(getAnnouncements()).toHaveLength(announcementCount);
  });
});
