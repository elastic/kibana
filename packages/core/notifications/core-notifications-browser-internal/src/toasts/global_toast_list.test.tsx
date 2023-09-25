/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiGlobalToastList } from '@elastic/eui';
import { Toast } from '@kbn/core-notifications-browser/src/types';
import { shallow } from 'enzyme';
import React from 'react';
import { Observable, from, EMPTY } from 'rxjs';

import { GlobalToastList } from './global_toast_list';

const mockDismissToast = jest.fn();

function render(props: Partial<GlobalToastList['props']> = {}) {
  return <GlobalToastList dismissToast={mockDismissToast} toasts$={EMPTY} {...props} />;
}

it('renders matching snapshot', () => {
  expect(shallow(render())).toMatchSnapshot();
});

it('subscribes to toasts$ on mount and unsubscribes on unmount', () => {
  const unsubscribeSpy = jest.fn();
  const subscribeSpy = jest.fn((observer) => {
    observer.next([]);
    return unsubscribeSpy;
  });

  const component = render({
    toasts$: new Observable<any>(subscribeSpy),
  });

  expect(subscribeSpy).not.toHaveBeenCalled();

  const el = shallow(component);
  expect(subscribeSpy).toHaveBeenCalledTimes(1);
  expect(unsubscribeSpy).not.toHaveBeenCalled();

  el.unmount();
  expect(subscribeSpy).toHaveBeenCalledTimes(1);
  expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
});

it('passes latest value from toasts$ to <EuiGlobalToastList />', () => {
  const el = shallow(
    render({
      toasts$: from([[], [{ id: '1' }], [{ id: '1' }, { id: '2' }]]) as any,
    })
  );

  expect(el.find(EuiGlobalToastList).prop('toasts')).toEqual([{ id: '1' }, { id: '2' }]);
});

describe('global_toast_list with duplicate elements', () => {
  const dummyText = `You've got mail!`;
  const dummyTitle = `AOL Notifications`;
  const toast = (id: any): Toast => ({
    id: id.toString(),
    text: dummyText,
    title: dummyTitle,
    toastLifeTimeMs: 5000,
  });

  const globalToastList = shallow(
    render({
      toasts$: from([[toast(0), toast(1), toast(2), toast(3)]]) as any,
    })
  );

  const euiToastList = globalToastList.find(EuiGlobalToastList);
  const toastsProp = euiToastList.prop('toasts');

  it('renders the list with a single element', () => {
    expect(toastsProp).toBeDefined();
    expect(toastsProp).toHaveLength(1);
    expect(euiToastList).toMatchSnapshot();
  });

  it('renders the single toast with the common text', () => {
    const firstRenderedToast = toastsProp![0];
    expect(firstRenderedToast.text).toBe(dummyText);
  });

  it(`calls all toast's dismiss when closed`, () => {
    const firstRenderedToast = toastsProp![0];
    const dismissToast = globalToastList.prop('dismissToast');
    dismissToast(firstRenderedToast);

    expect(mockDismissToast).toHaveBeenCalledTimes(4);
    expect(mockDismissToast).toHaveBeenCalledWith('0');
    expect(mockDismissToast).toHaveBeenCalledWith('1');
    expect(mockDismissToast).toHaveBeenCalledWith('2');
    expect(mockDismissToast).toHaveBeenCalledWith('3');
  });
});

describe('global_toast_list with duplicate elements, using MountPoints', () => {
  const dummyText = `You've got mail!`;
  const toast = (id: any): Toast => ({
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

  const globalToastList = shallow(
    render({
      toasts$: from([[toast(0), toast(1), toast(2), toast(3)]]) as any,
    })
  );

  const euiToastList = globalToastList.find(EuiGlobalToastList);
  const toastsProp = euiToastList.prop('toasts');

  it('renders the all separate elements element', () => {
    expect(toastsProp).toBeDefined();
    expect(toastsProp).toHaveLength(4);
    expect(euiToastList).toMatchSnapshot('euiToastList');
    expect(globalToastList).toMatchSnapshot('globalToastList');
  });
});
