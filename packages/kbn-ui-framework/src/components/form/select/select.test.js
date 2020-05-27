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
import { render, shallow } from 'enzyme';
import { requiredProps } from '../../../test/required_props';
import sinon from 'sinon';

import { KuiSelect, SELECT_SIZE } from './select';

describe('KuiSelect', () => {
  test('renders', () => {
    const component = (
      <KuiSelect onChange={() => {}} {...requiredProps}>
        <option value="apple">Apple</option>
        <option value="bread">Bread</option>
      </KuiSelect>
    );

    expect(render(component)).toMatchSnapshot();
  });

  describe('Props', () => {
    test('value', () => {
      const component = (
        <KuiSelect value="apple" onChange={() => {}}>
          <option value="apple">Apple</option>
          <option value="bread">Bread</option>
        </KuiSelect>
      );

      expect(render(component)).toMatchSnapshot();
    });

    describe('isInvalid', () => {
      test('true renders invalid', () => {
        const component = <KuiSelect isInvalid onChange={() => {}} />;

        expect(render(component)).toMatchSnapshot();
      });

      test('false renders valid', () => {
        const component = <KuiSelect isInvalid={false} onChange={() => {}} />;

        expect(render(component)).toMatchSnapshot();
      });
    });

    describe('isDisabled', () => {
      test('true renders disabled', () => {
        const component = <KuiSelect isDisabled onChange={() => {}} />;

        expect(render(component)).toMatchSnapshot();
      });

      test('false renders enabled', () => {
        const component = <KuiSelect isDisabled={false} onChange={() => {}} />;

        expect(render(component)).toMatchSnapshot();
      });
    });

    describe('size', () => {
      SELECT_SIZE.forEach((size) => {
        test(`renders ${size}`, () => {
          const component = <KuiSelect size={size} onChange={() => {}} />;

          expect(render(component)).toMatchSnapshot();
        });
      });
    });

    describe('onChange', () => {
      test(`is called when an option is selected`, () => {
        const onChangeHandler = sinon.spy();

        const wrapper = shallow(
          <KuiSelect onChange={onChangeHandler}>
            <option value="apple">Apple</option>
            <option value="bread">Bread</option>
          </KuiSelect>
        );

        wrapper.simulate('change', 'bread');
        sinon.assert.calledOnce(onChangeHandler);
      });
    });
  });
});
