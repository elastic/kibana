/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
  const subscribeSpy = jest.fn(observer => {
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
      toasts$: Rx.from([[], [{ id: 1 }], [{ id: 1 }, { id: 2 }]]) as any,
    })
  );

  expect(el.find(EuiGlobalToastList).prop('toasts')).toEqual([{ id: 1 }, { id: 2 }]);
});
