/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EuiGlobalToastList } from '@elastic/eui';
import { shallow } from 'enzyme';
import React from 'react';
import * as Rx from 'rxjs';

import { GlobalToastList } from './global_toast_list';

function render(props: Partial<GlobalToastList['props']> = {}) {
  return <GlobalToastList dismissToast={jest.fn()} toasts$={Rx.EMPTY} {...props} />;
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
    toasts$: new Rx.Observable<any>(subscribeSpy),
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
      toasts$: Rx.from([[], [{ id: '1' }], [{ id: '1' }, { id: '2' }]]) as any,
    })
  );

  expect(el.find(EuiGlobalToastList).prop('toasts')).toEqual([{ id: '1' }, { id: '2' }]);
});
