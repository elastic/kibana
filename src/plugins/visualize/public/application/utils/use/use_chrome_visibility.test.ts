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

import { act, renderHook } from '@testing-library/react-hooks';

import { chromeServiceMock } from '../../../../../../core/public/mocks';
import { useChromeVisibility } from './use_chrome_visibility';

describe('useChromeVisibility', () => {
  const chromeMock = chromeServiceMock.createStartContract();

  test('should set up a subscription for chrome visibility', () => {
    const { result } = renderHook(() => useChromeVisibility(chromeMock));

    expect(chromeMock.getIsVisible$).toHaveBeenCalled();
    expect(result.current).toEqual(false);
  });

  test('should change chrome visibility to true if change was emitted', () => {
    const { result } = renderHook(() => useChromeVisibility(chromeMock));
    const behaviorSubj = chromeMock.getIsVisible$.mock.results[0].value;
    act(() => {
      behaviorSubj.next(true);
    });

    expect(result.current).toEqual(true);
  });

  test('should destroy a subscription', () => {
    const { unmount } = renderHook(() => useChromeVisibility(chromeMock));
    const behaviorSubj = chromeMock.getIsVisible$.mock.results[0].value;
    const subscription = behaviorSubj.observers[0];
    subscription.unsubscribe = jest.fn();

    unmount();

    expect(subscription.unsubscribe).toHaveBeenCalled();
  });
});
