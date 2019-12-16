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
import sinon from 'sinon';

import { BUTTON_TYPES, KuiSubmitButton } from './button';

describe('KuiSubmitButton', () => {
  describe('Baseline', () => {
    test('is rendered', () => {
      const $button = render(<KuiSubmitButton />);

      expect($button).toMatchSnapshot();
    });

    test('HTML attributes are rendered', () => {
      const $button = render(
        <KuiSubmitButton
          aria-label="aria label"
          className="testClass1 testClass2"
          data-test-subj="test subject string"
          disabled
        />
      );

      expect($button).toMatchSnapshot();
    });
  });

  describe('Props', () => {
    describe('buttonType', () => {
      BUTTON_TYPES.forEach(buttonType => {
        describe(`${buttonType}`, () => {
          test(`renders the ${buttonType} class`, () => {
            const $button = render(<KuiSubmitButton buttonType={buttonType} />);
            expect($button).toMatchSnapshot();
          });
        });
      });
    });

    describe('children', () => {
      test('is rendered as value', () => {
        const $button = render(<KuiSubmitButton>Hello</KuiSubmitButton>);

        expect($button).toMatchSnapshot();
      });
    });

    describe('onClick', () => {
      test(`isn't called upon instantiation`, () => {
        const onClickHandler = sinon.stub();

        shallow(<KuiSubmitButton onClick={onClickHandler} />);

        sinon.assert.notCalled(onClickHandler);
      });

      test('is called when the button is clicked', () => {
        const onClickHandler = sinon.stub();

        const $button = shallow(<KuiSubmitButton onClick={onClickHandler} />);

        $button.simulate('click');

        sinon.assert.calledOnce(onClickHandler);
      });
    });
  });
});
