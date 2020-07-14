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
import { HelloWorldEmbeddable } from '../../../../../../examples/embeddable_examples/public';
import { EmbeddableRoot } from './embeddable_root';
import { mount } from 'enzyme';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';

test('EmbeddableRoot renders an embeddable', async () => {
  const embeddable = new HelloWorldEmbeddable({ id: 'hello' });
  const component = mount(<EmbeddableRoot embeddable={embeddable} />);
  // Due to the way embeddables mount themselves on the dom node, they are not forced to be
  // react components, and hence, we can't use the usual
  // findTestSubject.
  expect(
    component.getDOMNode().querySelectorAll('[data-test-subj="helloWorldEmbeddable"]').length
  ).toBe(1);
  expect(findTestSubject(component, 'embedSpinner').length).toBe(0);
  expect(findTestSubject(component, 'embedError').length).toBe(0);
});

test('EmbeddableRoot updates input', async () => {
  const embeddable = new HelloWorldEmbeddable({ id: 'hello' });
  const component = mount(<EmbeddableRoot embeddable={embeddable} />);
  const spy = jest.spyOn(embeddable, 'updateInput');
  const newInput = { id: 'hello', something: 'new' };
  component.setProps({ embeddable, input: newInput });
  expect(spy).toHaveBeenCalledWith(newInput);
});

test('EmbeddableRoot renders a spinner if loading an no embeddable given', async () => {
  const component = mount(<EmbeddableRoot loading={true} />);
  // Due to the way embeddables mount themselves on the dom node, they are not forced to be
  // react components, and hence, we can't use the usual
  // findTestSubject.
  expect(findTestSubject(component, 'embedSpinner').length).toBe(1);
  expect(findTestSubject(component, 'embedError').length).toBe(0);
});

test('EmbeddableRoot renders an error if given with no embeddable', async () => {
  const component = mount(<EmbeddableRoot error="bad" />);
  // Due to the way embeddables mount themselves on the dom node, they are not forced to be
  // react components, and hence, we can't use the usual
  // findTestSubject.
  expect(findTestSubject(component, 'embedError').length).toBe(1);
  expect(findTestSubject(component, 'embedSpinner').length).toBe(0);
});
