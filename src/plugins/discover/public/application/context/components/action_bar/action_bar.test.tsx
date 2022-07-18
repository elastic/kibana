/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { ActionBar, ActionBarProps } from './action_bar';
import { findTestSubject } from '@elastic/eui/lib/test';
import { MAX_CONTEXT_SIZE, MIN_CONTEXT_SIZE } from '../../services/constants';
import { SurrDocType } from '../../services/context';

describe('Test Discover Context ActionBar for successor | predecessor records', () => {
  [SurrDocType.SUCCESSORS, SurrDocType.PREDECESSORS].forEach((type) => {
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
      expect(onChangeCount).toHaveBeenCalledWith(type, 25);
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
      expect(onChangeCount).toHaveBeenCalledWith(type, 123);
    });

    test(`${type}: Count input change submits on return`, () => {
      input.simulate('change', { target: { valueAsNumber: 124 } });
      input.simulate('submit');
      expect(onChangeCount).toHaveBeenCalledWith(type, 124);
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
      if (type === SurrDocType.PREDECESSORS) {
        expect(findTestSubject(wrapper, 'predecessorsWarningMsg').text()).toBe(
          'No documents newer than the anchor could be found.'
        );
      } else {
        expect(findTestSubject(wrapper, 'successorsWarningMsg').text()).toBe(
          'No documents older than the anchor could be found.'
        );
      }
    });

    test(`${type}: Load button disabled when defaultStepSize is 0`, () => {
      const wrapperWhenZeroStep = mountWithIntl(<ActionBar {...props} defaultStepSize={0} />);
      const inputWhenZeroStep = findTestSubject(wrapperWhenZeroStep, `${type}CountPicker`);
      const btnWhenZeroStep = findTestSubject(wrapperWhenZeroStep, `${type}LoadMoreButton`);
      expect(btnWhenZeroStep.props().disabled).toBe(true);
      btnWhenZeroStep.simulate('click');
      expect(onChangeCount).toHaveBeenCalledTimes(0);
      inputWhenZeroStep.simulate('change', { target: { valueAsNumber: 3 } });
      btnWhenZeroStep.simulate('click');
      expect(onChangeCount).toHaveBeenCalledTimes(1);
    });
  });
});
