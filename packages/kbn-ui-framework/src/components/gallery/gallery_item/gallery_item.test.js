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
import { render, shallow } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import {
  KuiGalleryItem,
} from './gallery_item';

test('renders KuiGalleryItem with href', () => {
  const component = <KuiGalleryItem href="#" {...requiredProps}>children</KuiGalleryItem>;
  expect(render(component)).toMatchSnapshot();
});

test('renders KuiGalleryItem with onClick', () => {
  const component = <KuiGalleryItem onClick={() => {}} {...requiredProps}>children</KuiGalleryItem>;
  expect(render(component)).toMatchSnapshot();
});

test('renders KuiGalleryItem without href and onClick', () => {
  const component = <KuiGalleryItem {...requiredProps}>children</KuiGalleryItem>;
  expect(render(component)).toMatchSnapshot();
});

test('onClick on KuiGalleryItem is not triggered without click', () => {
  const onClickSpy = sinon.spy();
  render(<KuiGalleryItem onClick={onClickSpy} {...requiredProps}>children</KuiGalleryItem>);
  sinon.assert.notCalled(onClickSpy);
});

test('onClick on KuiGalleryItem is triggered when clicked', () => {
  const onClickSpy = sinon.spy();
  const element = shallow(<KuiGalleryItem onClick={onClickSpy} {...requiredProps}>children</KuiGalleryItem>);
  element.simulate('click');
  sinon.assert.calledOnce(onClickSpy);
});

test('KuiGalleryItem will throw when specified href and onClick', () => {
  const consoleError = sinon.stub(console, 'error');
  render(<KuiGalleryItem href="#" onClick={() => {}} {...requiredProps}>children</KuiGalleryItem>);
  expect(consoleError.calledOnce).toBe(true);
  const msg = consoleError.getCalls()[0].args[0];
  expect(msg).toContain('Failed prop type');
  console.error.restore();
});
