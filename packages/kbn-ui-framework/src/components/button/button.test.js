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

import { BUTTON_TYPES, KuiButton } from './button';

describe('KuiButton', () => {
  describe('Baseline', () => {
    test('is rendered', () => {
      const $button = render(<KuiButton aria-label="aria label" />);

      expect($button).toMatchSnapshot();
    });

    test('HTML attributes are rendered', () => {
      const $button = render(
        <KuiButton
          aria-label="aria label"
          className="testClass1 testClass2"
          data-test-subj="test subject string"
          type="submit"
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
            const $button = render(<KuiButton buttonType={buttonType} aria-label="aria label" />);
            expect($button).toMatchSnapshot();
          });
        });
      });
    });

    describe('icon', () => {
      test('is rendered with children', () => {
        const $button = render(<KuiButton icon="Icon">Hello</KuiButton>);

        expect($button).toMatchSnapshot();
      });

      test('is rendered without children', () => {
        const $button = render(<KuiButton icon="Icon" aria-label="aria label" />);

        expect($button).toMatchSnapshot();
      });
    });

    describe('iconPosition', () => {
      test('moves the icon to the right', () => {
        const $button = render(
          <KuiButton icon="Icon" iconPosition="right">
            Hello
          </KuiButton>
        );

        expect($button).toMatchSnapshot();
      });
    });

    describe('children', () => {
      test('is rendered', () => {
        const $button = render(<KuiButton>Hello</KuiButton>);

        expect($button).toMatchSnapshot();
      });
    });

    describe('onClick', () => {
      test(`isn't called upon instantiation`, () => {
        const onClickHandler = sinon.stub();

        shallow(<KuiButton onClick={onClickHandler} aria-label="aria label" />);

        sinon.assert.notCalled(onClickHandler);
      });

      test('is called when the button is clicked', () => {
        const onClickHandler = sinon.stub();

        const $button = shallow(<KuiButton onClick={onClickHandler} aria-label="aria label" />);

        $button.simulate('click');

        sinon.assert.calledOnce(onClickHandler);
      });
    });

    describe('isLoading', () => {
      test('renders a spinner', () => {
        const $button = render(<KuiButton isLoading aria-label="aria label" />);

        expect($button).toMatchSnapshot();
      });

      test(`doesn't render the icon prop`, () => {
        const $button = render(<KuiButton isLoading icon="Icon" aria-label="aria label" />);

        expect($button).toMatchSnapshot();
      });
    });
  });
});
