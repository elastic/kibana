/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { HelloWorldEmbeddable, HelloWorldEmbeddableReact } from '../../tests/fixtures';
import { EmbeddableRoot } from './embeddable_root';
import { mount } from 'enzyme';
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

test('EmbeddableRoot renders a React-based embeddable', async () => {
  const embeddable = new HelloWorldEmbeddableReact({ id: 'hello' });
  const component = mount(<EmbeddableRoot embeddable={embeddable} />);

  expect(component.find('[data-test-subj="helloWorldEmbeddable"]')).toHaveLength(1);
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
