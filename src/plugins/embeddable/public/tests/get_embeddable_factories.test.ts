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

import { testPlugin } from './test_plugin';
import { FilterableContainerFactory } from '../lib/test_samples/embeddables/filterable_container_factory';
import { ContactCardEmbeddableFactory } from '../lib/test_samples/embeddables/contact_card/contact_card_embeddable_factory';

test('exports getEmbeddableFactories() function', () => {
  const { doStart } = testPlugin();
  expect(typeof doStart().getEmbeddableFactories).toBe('function');
});

test('returns empty list if there are no embeddable factories', () => {
  const { doStart } = testPlugin();
  const start = doStart();
  const list = [...start.getEmbeddableFactories()];
  expect(list).toEqual([]);
});

test('returns existing embeddable factories', () => {
  const { setup, doStart } = testPlugin();
  const start = doStart();
  const { length } = [...start.getEmbeddableFactories()];

  const factory1 = new FilterableContainerFactory(start.getEmbeddableFactory);
  const factory2 = new ContactCardEmbeddableFactory({} as any, (() => null) as any, {} as any);
  setup.registerEmbeddableFactory(factory1.type, factory1);
  setup.registerEmbeddableFactory(factory2.type, factory2);

  const list = [...start.getEmbeddableFactories()];
  expect(list.length - length).toBe(2);
  expect(!!list.find(({ type }) => factory1.type === type)).toBe(true);
  expect(!!list.find(({ type }) => factory2.type === type)).toBe(true);
});
