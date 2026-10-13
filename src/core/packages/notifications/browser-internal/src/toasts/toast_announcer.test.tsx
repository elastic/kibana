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
import type { Toast } from '@kbn/core-notifications-browser';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { ToastsTelemetry } from './telemetry';
import { GlobalToastList } from './global_toast_list';
import { TOAST_ANNOUNCEMENT_DELAY_MS } from './toast_announcer';

const toastsTelemetry = new ToastsTelemetry();
toastsTelemetry.setup({ analytics: analyticsServiceMock.createAnalyticsServiceSetup() });

const renderToastList = (initialToasts: Toast[] = []) => {
  const toasts$ = new BehaviorSubject<Toast[]>(initialToasts);
  render(
    <GlobalToastList
      toasts$={toasts$}
      dismissToast={jest.fn()}
      reportEvent={toastsTelemetry.start({
        analytics: analyticsServiceMock.createAnalyticsServiceStart(),
      })}
    />
  );
  const addToast = (toast: Toast) => act(() => toasts$.next([...toasts$.getValue(), toast]));
  return { toasts$, addToast };
};

const advanceTimers = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

const getAnnouncer = () => screen.getByRole('status');
const getAnnouncement = () => getAnnouncer().textContent;

describe('ToastAnnouncer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  it('disables the live region of the visual toast list to avoid duplicate announcements', () => {
    renderToastList();

    expect(screen.getByTestId('globalToastList').getAttribute('aria-live')).toBe('off');
  });

  it('announces a new toast with its type after a short delay', async () => {
    const { addToast } = renderToastList();

    addToast({ id: '1', title: 'Saved field', text: 'All good', color: 'success' });

    expect(getAnnouncement()).toBe('');

    await advanceTimers(TOAST_ANNOUNCEMENT_DELAY_MS);

    expect(getAnnouncement()).toContain('Success: Saved field. All good');
  });

  it.each([
    ['warning', 'Warning: Careful'],
    ['danger', 'Error: Careful'],
    ['primary', 'Notification: Careful'],
    [undefined, 'Notification: Careful'],
  ] as const)('prefixes a %s toast announcement with its type', async (color, expected) => {
    const { addToast } = renderToastList();

    addToast({ id: '1', title: 'Careful', color });
    await advanceTimers(TOAST_ANNOUNCEMENT_DELAY_MS);

    expect(getAnnouncement()).toContain(expected);
  });

  it('announces the rendered text of mount point content', async () => {
    const { addToast } = renderToastList();

    addToast({
      id: '1',
      title: 'Error deleting synonyms set',
      text: (element) => {
        element.textContent = 'Request failed with status 500';
        return () => {};
      },
      color: 'danger',
    });
    await advanceTimers(TOAST_ANNOUNCEMENT_DELAY_MS);

    expect(getAnnouncement()).toContain(
      'Error: Error deleting synonyms set. Request failed with status 500'
    );
  });

  it('waits for an open modal to close before announcing', async () => {
    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    document.body.appendChild(modal);

    const { addToast } = renderToastList();

    addToast({ id: '1', title: 'Synonyms set deleted', color: 'success' });
    await advanceTimers(TOAST_ANNOUNCEMENT_DELAY_MS * 10);

    expect(getAnnouncement()).toBe('');

    await act(async () => {
      modal.remove();
    });
    await advanceTimers(TOAST_ANNOUNCEMENT_DELAY_MS);

    expect(getAnnouncement()).toContain('Success: Synonyms set deleted');
  });

  it('does not announce a toast that was dismissed before it could be announced', async () => {
    const { toasts$, addToast } = renderToastList();

    addToast({ id: '1', title: 'Gone already', color: 'success' });
    act(() => toasts$.next([]));
    await advanceTimers(TOAST_ANNOUNCEMENT_DELAY_MS);

    expect(getAnnouncement()).toBe('');
  });

  it('announces toasts added at the same time together', async () => {
    const { addToast } = renderToastList();

    addToast({ id: '1', title: 'First', color: 'success' });
    addToast({ id: '2', title: 'Second', color: 'warning' });
    await advanceTimers(TOAST_ANNOUNCEMENT_DELAY_MS);

    expect(getAnnouncement()).toContain('Success: First');
    expect(getAnnouncement()).toContain('Warning: Second');
  });

  it('does not re-announce previous toasts when another toast is dismissed', async () => {
    const { toasts$, addToast } = renderToastList();

    addToast({ id: '1', title: 'First', color: 'success' });
    await advanceTimers(TOAST_ANNOUNCEMENT_DELAY_MS);
    addToast({ id: '2', title: 'Second', color: 'success' });
    await advanceTimers(TOAST_ANNOUNCEMENT_DELAY_MS);

    expect(getAnnouncement()).toContain('Success: Second');

    act(() => toasts$.next(toasts$.getValue().filter(({ id }) => id !== '1')));
    await advanceTimers(TOAST_ANNOUNCEMENT_DELAY_MS);

    expect(getAnnouncement()).toContain('Success: Second');
    expect(getAnnouncement()).not.toContain('First');
  });

  it('announces a repeated toast that is grouped with an existing one', async () => {
    const { addToast } = renderToastList();

    addToast({ id: '1', title: 'Saved', color: 'success' });
    await advanceTimers(TOAST_ANNOUNCEMENT_DELAY_MS);

    const [firstRegion, secondRegion] = screen.getAllByRole('status', { hidden: true });
    const regionWithAnnouncement = firstRegion.textContent ? firstRegion : secondRegion;

    addToast({ id: '2', title: 'Saved', color: 'success' });
    await advanceTimers(TOAST_ANNOUNCEMENT_DELAY_MS);

    expect(getAnnouncement()).toContain('Success: Saved');
    // The announcement moved to the other live region, so screen readers announce it again
    expect(getAnnouncer()).not.toBe(regionWithAnnouncement);
  });
});
