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

import { KuiTextArea, TEXTAREA_SIZE } from './text_area';

describe('KuiTextArea', () => {
  test('renders', () => {
    const component = <KuiTextArea value="text area" onChange={() => {}} {...requiredProps} />;

    expect(render(component)).toMatchSnapshot();
  });

  describe('Props', () => {
    test('placeholder', () => {
      const component = <KuiTextArea placeholder="placeholder" onChange={() => {}} />;

      expect(render(component)).toMatchSnapshot();
    });

    test('value', () => {
      const component = <KuiTextArea value="value" onChange={() => {}} />;

      expect(render(component)).toMatchSnapshot();
    });

    describe('isInvalid', () => {
      test('true renders invalid', () => {
        const component = <KuiTextArea isInvalid onChange={() => {}} />;

        expect(render(component)).toMatchSnapshot();
      });

      test('false renders valid', () => {
        const component = <KuiTextArea isInvalid={false} onChange={() => {}} />;

        expect(render(component)).toMatchSnapshot();
      });
    });

    describe('isNonResizable', () => {
      test('true renders non-resizable', () => {
        const component = <KuiTextArea isNonResizable onChange={() => {}} />;

        expect(render(component)).toMatchSnapshot();
      });

      test('false renders resizable', () => {
        const component = <KuiTextArea isNonResizable={false} onChange={() => {}} />;

        expect(render(component)).toMatchSnapshot();
      });
    });

    describe('isDisabled', () => {
      test('true renders disabled', () => {
        const component = <KuiTextArea isDisabled onChange={() => {}} />;

        expect(render(component)).toMatchSnapshot();
      });

      test('false renders enabled', () => {
        const component = <KuiTextArea isDisabled={false} onChange={() => {}} />;

        expect(render(component)).toMatchSnapshot();
      });
    });

    describe('size', () => {
      TEXTAREA_SIZE.forEach(size => {
        test(`renders ${size}`, () => {
          const component = <KuiTextArea size={size} onChange={() => {}} />;

          expect(render(component)).toMatchSnapshot();
        });
      });
    });

    describe('onChange', () => {
      test(`is called when textarea is written`, () => {
        const onChangeHandler = sinon.spy();

        const wrapper = shallow(<KuiTextArea onChange={onChangeHandler} />);

        wrapper.simulate('change');
        sinon.assert.calledOnce(onChangeHandler);
      });
    });
  });
});
