/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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

  const factory1 = new FilterableContainerFactory(async () => await start.getEmbeddableFactory);
  const factory2 = new ContactCardEmbeddableFactory((() => null) as any, {} as any);
  setup.registerEmbeddableFactory(factory1.type, factory1);
  setup.registerEmbeddableFactory(factory2.type, factory2);

  const start = doStart();

  const list = [...start.getEmbeddableFactories()];
  expect(list.length).toBe(2);
  expect(!!list.find(({ type }) => factory1.type === type)).toBe(true);
  expect(!!list.find(({ type }) => factory2.type === type)).toBe(true);
});
