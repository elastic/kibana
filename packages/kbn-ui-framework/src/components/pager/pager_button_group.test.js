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
import sinon from 'sinon';
import { render, mount } from 'enzyme';
import { findTestSubject, requiredProps } from '../../test';

import { KuiPagerButtonGroup } from './pager_button_group';

let onNext;
let onPrevious;

beforeEach(() => {
  onNext = sinon.spy();
  onPrevious = sinon.spy();
});

test('renders KuiPagerButtonGroup', () => {
  const component = (
    <KuiPagerButtonGroup
      onNext={onNext}
      onPrevious={onPrevious}
      hasNext={true}
      hasPrevious={true}
      {...requiredProps}
    />
  );
  expect(render(component)).toMatchSnapshot();
});

describe('property', () => {
  function findPreviousButton(pager) {
    return findTestSubject(pager, 'pagerPreviousButton');
  }

  function findNextButton(pager) {
    return findTestSubject(pager, 'pagerNextButton');
  }

  test('onNext', () => {
    const component = (
      <KuiPagerButtonGroup
        onNext={onNext}
        onPrevious={onPrevious}
        hasNext={true}
        hasPrevious={true}
      />
    );
    const pager = mount(component);
    findNextButton(pager).simulate('click');
    sinon.assert.calledOnce(onNext);
    sinon.assert.notCalled(onPrevious);
  });

  test('onPrevious', () => {
    const component = (
      <KuiPagerButtonGroup
        onNext={onNext}
        onPrevious={onPrevious}
        hasNext={true}
        hasPrevious={true}
      />
    );
    const pager = mount(component);
    findPreviousButton(pager).simulate('click');
    sinon.assert.calledOnce(onPrevious);
    sinon.assert.notCalled(onNext);
  });

  describe('hasNext', () => {
    test('is enabled when true', () => {
      const component = (
        <KuiPagerButtonGroup
          onNext={onNext}
          onPrevious={onPrevious}
          hasNext={true}
          hasPrevious={true}
        />
      );
      const pager = mount(component);
      const isDisabled = findNextButton(pager).prop('disabled');
      expect(isDisabled).toBe(false);
    });

    test('is disabled when false', () => {
      const component = (
        <KuiPagerButtonGroup
          onNext={onNext}
          onPrevious={onPrevious}
          hasNext={false}
          hasPrevious={true}
        />
      );
      const pager = mount(component);
      const isDisabled = findNextButton(pager).prop('disabled');
      expect(isDisabled).toBe(true);
    });
  });

  describe('hasPrevious', () => {
    test('is enabled when true', () => {
      const component = (
        <KuiPagerButtonGroup
          onNext={onNext}
          onPrevious={onPrevious}
          hasNext={true}
          hasPrevious={true}
        />
      );
      const pager = mount(component);
      const isDisabled = findPreviousButton(pager).prop('disabled');
      expect(isDisabled).toBe(false);
    });

    test('is disabled when false', () => {
      const component = (
        <KuiPagerButtonGroup
          onNext={onNext}
          onPrevious={onPrevious}
          hasNext={true}
          hasPrevious={false}
        />
      );
      const pager = mount(component);
      const isDisabled = findPreviousButton(pager).prop('disabled');
      expect(isDisabled).toBe(true);
    });
  });
});
