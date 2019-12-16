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
import {
  HELLO_WORLD_EMBEDDABLE,
  HelloWorldEmbeddableFactory,
} from '../../../../../../examples/embeddable_examples/public';
import { EmbeddableFactory } from './embeddable_factory';
import { GetEmbeddableFactory } from '../types';
import { EmbeddableFactoryRenderer } from './embeddable_factory_renderer';
import { mount } from 'enzyme';
import { nextTick } from 'test_utils/enzyme_helpers';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';

test('EmbeddableFactoryRenderer renders an embeddable', async () => {
  const embeddableFactories = new Map<string, EmbeddableFactory>();
  embeddableFactories.set(HELLO_WORLD_EMBEDDABLE, new HelloWorldEmbeddableFactory());
  const getEmbeddableFactory: GetEmbeddableFactory = (id: string) => embeddableFactories.get(id);

  const component = mount(
    <EmbeddableFactoryRenderer
      getEmbeddableFactory={getEmbeddableFactory}
      type={HELLO_WORLD_EMBEDDABLE}
      input={{ id: '123' }}
    />
  );

  await nextTick();
  component.update();

  // Due to the way embeddables mount themselves on the dom node, they are not forced to be
  // react components, and hence, we can't use the usual
  // findTestSubject(component, 'subjIdHere');
  expect(
    component.getDOMNode().querySelectorAll('[data-test-subj="helloWorldEmbeddable"]').length
  ).toBe(1);
});

test('EmbeddableRoot renders an error if the type does not exist', async () => {
  const getEmbeddableFactory: GetEmbeddableFactory = (id: string) => undefined;

  const component = mount(
    <EmbeddableFactoryRenderer
      getEmbeddableFactory={getEmbeddableFactory}
      type={HELLO_WORLD_EMBEDDABLE}
      input={{ id: '123' }}
    />
  );

  await nextTick();
  component.update();
  expect(findTestSubject(component, 'embedSpinner').length).toBe(0);
  expect(findTestSubject(component, 'embedError').length).toBe(1);
});
