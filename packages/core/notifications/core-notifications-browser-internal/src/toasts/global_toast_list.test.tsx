/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Toast } from '@kbn/core-notifications-browser/src/types';
import React, { type ComponentProps } from 'react';
import { Observable, from, EMPTY, BehaviorSubject } from 'rxjs';
import { screen, render, fireEvent, act } from '@testing-library/react';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { EventReporter } from './telemetry';

import { GlobalToastList } from './global_toast_list';

const mockAnalytics = analyticsServiceMock.createAnalyticsServiceStart();

const sharedProps = {
  toasts$: EMPTY,
  dismissToast: jest.fn(),
  reportEvent: new EventReporter({ analytics: mockAnalytics }),
};

function RenderToastList(props: Partial<ComponentProps<typeof GlobalToastList>> = {}) {
  return <GlobalToastList {...sharedProps} {...props} />;
}

it('subscribes to toasts$ on mount and unsubscribes on unmount', () => {
  const unsubscribeSpy = jest.fn();
  const subscribeSpy = jest.fn((observer) => {
    observer.next([]);
    return unsubscribeSpy;
  });

  const { unmount } = render(<RenderToastList toasts$={new Observable<any>(subscribeSpy)} />);

  expect(subscribeSpy).toHaveBeenCalledTimes(1);
  expect(unsubscribeSpy).not.toHaveBeenCalled();

  unmount();

  expect(subscribeSpy).toHaveBeenCalledTimes(1);
  expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
});

it('uses the latest value from toasts$ passed to <EuiGlobalToastList /> to render the right number of toasts', () => {
  const toastObservable$ = new BehaviorSubject([{ id: '1' }, { id: '2' }]);

  render(<RenderToastList toasts$={toastObservable$.asObservable() as any} />);

  expect(screen.getAllByLabelText('Notification')).toHaveLength(2);

  act(() => {
    toastObservable$.next([...toastObservable$.getValue(), { id: '3' }]);
  });

  expect(screen.getAllByLabelText('Notification')).toHaveLength(3);
});

describe('global_toast_list with duplicate elements', () => {
  const dummyText = `You've got mail!`;
  const dummyTitle = `AOL Notifications`;
  const createMockToast = (id: any): Toast => ({
    id: id.toString(),
    text: dummyText,
    title: dummyTitle,
    toastLifeTimeMs: 5000,
  });

  function ToastListWithDuplicates() {
    return (
      <RenderToastList
        toasts$={from([Array.from(new Array(4)).map((_, idx) => createMockToast(idx))]) as any}
      />
    );
  }

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the toast list with a single element', () => {
    render(<ToastListWithDuplicates />);

    expect(screen.getAllByLabelText('Notification')).toHaveLength(1);
  });

  it('renders a single toast in the toast list with the common text', () => {
    render(<ToastListWithDuplicates />);

    expect(screen.getAllByText(dummyText)).toHaveLength(1);
  });

  it(`when a represented toast is closed,the provided dismiss action is called for all its internal toasts`, () => {
    render(<ToastListWithDuplicates />);

    const { 0: toastDismissButton, length: toastDismissButtonLength } =
      screen.getAllByLabelText('Dismiss toast');

    expect(toastDismissButtonLength).toEqual(1);

    fireEvent.click(toastDismissButton);

    act(() => {
      // This is so that the toast fade out animation has succesfully ran,
      // only after this is the dismiss method invoked
      jest.runAllTimers();
    });

    expect(sharedProps.dismissToast).toHaveBeenCalledTimes(4);
    expect(sharedProps.dismissToast).toHaveBeenCalledWith('0');
    expect(sharedProps.dismissToast).toHaveBeenCalledWith('1');
    expect(sharedProps.dismissToast).toHaveBeenCalledWith('2');
    expect(sharedProps.dismissToast).toHaveBeenCalledWith('3');
  });
});

describe('global_toast_list with duplicate elements, using MountPoints', () => {
  const dummyText = `You've got mail!`;
  const createMockToastWithMountPoints = (id: any): Toast => ({
    id: id.toString(),
    text: dummyText,
    title: (element) => {
      const a = document.createElement('a');
      a.innerText = 'Click me!';
      a.href = 'https://elastic.co';
      element.appendChild(a);
      return () => element.removeChild(a);
    },
    toastLifeTimeMs: 5000,
  });

  it('renders the all separate elements element', () => {
    render(
      <RenderToastList
        toasts$={
          from([
            Array.from(new Array(4)).map((_, idx) => createMockToastWithMountPoints(idx)),
          ]) as any
        }
      />
    );

    const renderedToasts = screen.getAllByText(dummyText);

    expect(renderedToasts).toHaveLength(4);
  });
});
