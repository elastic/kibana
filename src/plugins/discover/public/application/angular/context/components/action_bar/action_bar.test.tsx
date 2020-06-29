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

import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { ActionBar, ActionBarProps } from './action_bar';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';
import { MAX_CONTEXT_SIZE, MIN_CONTEXT_SIZE } from '../../query_parameters/constants';

describe('Test Discover Context ActionBar for successor | predecessor records', () => {
  ['successors', 'predecessors'].forEach((type) => {
    const onChangeCount = jest.fn();
    const props = {
      defaultStepSize: 5,
      docCount: 20,
      docCountAvailable: 0,
      isDisabled: false,
      isLoading: false,
      onChangeCount,
      type,
    } as ActionBarProps;
    const wrapper = mountWithIntl(<ActionBar {...props} />);

    const input = findTestSubject(wrapper, `${type}CountPicker`);
    const btn = findTestSubject(wrapper, `${type}LoadMoreButton`);

    test(`${type}: Load button click`, () => {
      btn.simulate('click');
      expect(onChangeCount).toHaveBeenCalledWith(25);
    });

    test(`${type}: Load button click doesnt submit when MAX_CONTEXT_SIZE was reached`, () => {
      onChangeCount.mockClear();
      input.simulate('change', { target: { valueAsNumber: MAX_CONTEXT_SIZE } });
      btn.simulate('click');
      expect(onChangeCount).toHaveBeenCalledTimes(0);
    });

    test(`${type}: Count input change submits on blur`, () => {
      input.simulate('change', { target: { valueAsNumber: 123 } });
      input.simulate('blur');
      expect(onChangeCount).toHaveBeenCalledWith(123);
    });

    test(`${type}: Count input change submits on return`, () => {
      input.simulate('change', { target: { valueAsNumber: 124 } });
      input.simulate('submit');
      expect(onChangeCount).toHaveBeenCalledWith(124);
    });

    test(`${type}: Count input doesnt submits values higher than MAX_CONTEXT_SIZE `, () => {
      onChangeCount.mockClear();
      input.simulate('change', { target: { valueAsNumber: MAX_CONTEXT_SIZE + 1 } });
      input.simulate('submit');
      expect(onChangeCount).toHaveBeenCalledTimes(0);
    });

    test(`${type}: Count input doesnt submits values lower than MIN_CONTEXT_SIZE `, () => {
      onChangeCount.mockClear();
      input.simulate('change', { target: { valueAsNumber: MIN_CONTEXT_SIZE - 1 } });
      input.simulate('submit');
      expect(onChangeCount).toHaveBeenCalledTimes(0);
    });

    test(`${type}: Warning about limitation of additional records`, () => {
      if (type === 'predecessors') {
        expect(findTestSubject(wrapper, 'predecessorsWarningMsg').text()).toBe(
          'No documents newer than the anchor could be found.'
        );
      } else {
        expect(findTestSubject(wrapper, 'successorsWarningMsg').text()).toBe(
          'No documents older than the anchor could be found.'
        );
      }
    });
  });
});
