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

import { KuiPager } from './pager';

let onPreviousPage;
let onNextPage;

beforeEach(() => {
  onPreviousPage = sinon.spy();
  onNextPage = sinon.spy();
});

test('renders KuiPager', () => {
  const component = (
    <KuiPager
      hasPreviousPage={false}
      hasNextPage={true}
      onPreviousPage={onPreviousPage}
      onNextPage={onNextPage}
      startNumber={1}
      endNumber={10}
      totalItems={20}
      {...requiredProps}
    />
  );
  expect(render(component)).toMatchSnapshot();
});

describe('property', () => {
  describe('hasPreviousPage', () => {
    test('disables previous button when false', () => {
      const component = (
        <KuiPager
          hasPreviousPage={false}
          hasNextPage={true}
          onPreviousPage={onPreviousPage}
          onNextPage={onNextPage}
          startNumber={1}
          endNumber={10}
          totalItems={20}
        />
      );
      expect(render(component)).toMatchSnapshot();
    });
  });

  describe('hasNextPage', () => {
    test('disables next button when false', () => {
      const component = (
        <KuiPager
          hasPreviousPage={true}
          hasNextPage={false}
          onPreviousPage={onPreviousPage}
          onNextPage={onNextPage}
          startNumber={1}
          endNumber={10}
          totalItems={20}
        />
      );
      expect(render(component)).toMatchSnapshot();
    });
  });

  describe('onPreviousPage', () => {
    test('is called when clicked', () => {
      const component = (
        <KuiPager
          hasPreviousPage={true}
          hasNextPage={true}
          onPreviousPage={onPreviousPage}
          onNextPage={onNextPage}
          startNumber={1}
          endNumber={10}
          totalItems={20}
        />
      );
      const pager = mount(component);
      findTestSubject(pager, 'pagerPreviousButton').simulate('click');
      sinon.assert.calledOnce(onPreviousPage);
      sinon.assert.notCalled(onNextPage);
    });
  });

  describe('onNextPage', () => {
    test('is called when clicked', () => {
      const component = (
        <KuiPager
          hasPreviousPage={true}
          hasNextPage={true}
          onPreviousPage={onPreviousPage}
          onNextPage={onNextPage}
          startNumber={1}
          endNumber={10}
          totalItems={20}
        />
      );
      const pager = mount(component);
      findTestSubject(pager, 'pagerNextButton').simulate('click');
      sinon.assert.calledOnce(onNextPage);
      sinon.assert.notCalled(onPreviousPage);
    });
  });
});
