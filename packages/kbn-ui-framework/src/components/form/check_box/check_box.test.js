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

import { KuiCheckBox } from './check_box';

describe('KuiCheckBox', () => {
  test('renders', () => {
    const component = <KuiCheckBox onChange={() => {}} {...requiredProps} />;

    expect(render(component)).toMatchSnapshot();
  });

  describe('Props', () => {
    describe('isChecked', () => {
      test('true renders checked', () => {
        const component = <KuiCheckBox isChecked onChange={() => {}} />;

        expect(render(component)).toMatchSnapshot();
      });

      test('false renders unchecked', () => {
        const component = <KuiCheckBox isChecked={false} onChange={() => {}} />;

        expect(render(component)).toMatchSnapshot();
      });
    });

    describe('isDisabled', () => {
      test('true renders disabled', () => {
        const component = <KuiCheckBox isDisabled onChange={() => {}} />;

        expect(render(component)).toMatchSnapshot();
      });

      test('false renders enabled', () => {
        const component = <KuiCheckBox isDisabled={false} onChange={() => {}} />;

        expect(render(component)).toMatchSnapshot();
      });
    });

    describe('onChange', () => {
      test(`is called when checkbox is changed`, () => {
        const onChangeHandler = sinon.spy();

        const wrapper = shallow(<KuiCheckBox onChange={onChangeHandler} />);

        wrapper.simulate('change');
        sinon.assert.calledOnce(onChangeHandler);
      });
    });
  });
});
