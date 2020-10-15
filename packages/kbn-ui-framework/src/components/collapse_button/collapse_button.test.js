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
import { requiredProps } from '../../test/required_props';
import sinon from 'sinon';

import { DIRECTIONS, KuiCollapseButton } from './collapse_button';

describe('KuiCollapseButton', () => {
  describe('Props', () => {
    describe('direction', () => {
      DIRECTIONS.forEach((direction) => {
        describe(`${direction}`, () => {
          test(`renders the ${direction} class`, () => {
            const component = <KuiCollapseButton direction={direction} {...requiredProps} />;
            expect(render(component)).toMatchSnapshot();
          });
        });
      });
    });

    describe('onClick', () => {
      test(`isn't called upon instantiation`, () => {
        const onClickHandler = sinon.stub();

        shallow(<KuiCollapseButton direction="left" onClick={onClickHandler} />);

        sinon.assert.notCalled(onClickHandler);
      });

      test('is called when the button is clicked', () => {
        const onClickHandler = sinon.stub();

        const $button = shallow(<KuiCollapseButton direction="left" onClick={onClickHandler} />);

        $button.simulate('click');

        sinon.assert.calledOnce(onClickHandler);
      });
    });
  });
});
