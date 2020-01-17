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
import { render, shallow, mount } from 'enzyme';
import { requiredProps, findTestSubject } from '../../../test';
import sinon from 'sinon';

import { KuiTextInput, TEXTINPUT_SIZE } from './text_input';

describe('KuiTextInput', () => {
  test('renders', () => {
    const component = <KuiTextInput value="text input" onChange={() => {}} {...requiredProps} />;

    expect(render(component)).toMatchSnapshot();
  });

  describe('Props', () => {
    test('placeholder', () => {
      const component = <KuiTextInput placeholder="placeholder" onChange={() => {}} />;

      expect(render(component)).toMatchSnapshot();
    });

    test('value', () => {
      const component = <KuiTextInput value="value" onChange={() => {}} />;

      expect(render(component)).toMatchSnapshot();
    });

    describe('autoFocus', () => {
      test('sets focus on the element', () => {
        const component = mount(
          <KuiTextInput autoFocus onChange={() => {}} data-test-subj="input" />
        );

        expect(findTestSubject(component, 'input').getDOMNode()).toBe(document.activeElement);
      });

      test('does not focus the element by default', () => {
        const component = mount(<KuiTextInput onChange={() => {}} data-test-subj="input" />);

        expect(findTestSubject(component, 'input').getDOMNode()).not.toBe(document.activeElement);
      });
    });

    describe('isInvalid', () => {
      test('true renders invalid', () => {
        const component = <KuiTextInput isInvalid onChange={() => {}} />;

        expect(render(component)).toMatchSnapshot();
      });

      test('false renders valid', () => {
        const component = <KuiTextInput isInvalid={false} onChange={() => {}} />;

        expect(render(component)).toMatchSnapshot();
      });
    });

    describe('isDisabled', () => {
      test('true renders disabled', () => {
        const component = <KuiTextInput isDisabled onChange={() => {}} />;

        expect(render(component)).toMatchSnapshot();
      });

      test('false renders enabled', () => {
        const component = <KuiTextInput isDisabled={false} onChange={() => {}} />;

        expect(render(component)).toMatchSnapshot();
      });
    });

    describe('size', () => {
      TEXTINPUT_SIZE.forEach(size => {
        test(`renders ${size}`, () => {
          const component = <KuiTextInput size={size} onChange={() => {}} />;

          expect(render(component)).toMatchSnapshot();
        });
      });
    });

    describe('onChange', () => {
      test(`is called when input is changed`, () => {
        const onChangeHandler = sinon.spy();

        const wrapper = shallow(<KuiTextInput onChange={onChangeHandler} />);

        wrapper.simulate('change');
        sinon.assert.calledOnce(onChangeHandler);
      });
    });
  });
});
