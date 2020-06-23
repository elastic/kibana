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
import { EmbeddableOutput, isErrorEmbeddable, createFilterAction } from '../lib';
import {
  FilterableContainer,
  FilterableContainerInput,
  FILTERABLE_CONTAINER,
  FilterableEmbeddableFactory,
  HelloWorldContainer,
  FILTERABLE_EMBEDDABLE,
  FilterableEmbeddable,
  FilterableContainerFactory,
  FilterableEmbeddableInput,
} from '../lib/test_samples';
// eslint-disable-next-line
import { esFilters } from '../../../data/public';

test('ApplyFilterAction applies the filter to the root of the container tree', async () => {
  const { doStart, setup } = testPlugin();

  const factory2 = new FilterableEmbeddableFactory();
  const factory1 = new FilterableContainerFactory(async () => await api.getEmbeddableFactory);
  setup.registerEmbeddableFactory(factory2.type, factory2);
  setup.registerEmbeddableFactory(factory1.type, factory1);

  const api = doStart();

  const applyFilterAction = createFilterAction();

  const root = new FilterableContainer(
    { id: 'root', panels: {}, filters: [] },
    api.getEmbeddableFactory
  );

  const node1 = await root.addNewEmbeddable<
    FilterableContainerInput,
    EmbeddableOutput,
    FilterableContainer
  >(FILTERABLE_CONTAINER, { panels: {}, id: 'node1' });

  const node2 = await root.addNewEmbeddable<
    FilterableContainerInput,
    EmbeddableOutput,
    FilterableContainer
  >(FILTERABLE_CONTAINER, { panels: {}, id: 'Node2' });

  if (isErrorEmbeddable(node1) || isErrorEmbeddable(node2)) {
    throw new Error();
  }

  const embeddable = await node2.addNewEmbeddable<
    FilterableEmbeddableInput,
    EmbeddableOutput,
    FilterableEmbeddable
  >(FILTERABLE_EMBEDDABLE, { id: 'leaf' });

  if (isErrorEmbeddable(embeddable)) {
    throw new Error();
  }

  const filter: any = {
    $state: { store: esFilters.FilterStateStore.APP_STATE },
    meta: {
      disabled: false,
      negate: false,
      alias: '',
    },
    query: { match: { extension: { query: 'foo' } } },
  };

  await applyFilterAction.execute({ embeddable, filters: [filter] });
  expect(root.getInput().filters.length).toBe(1);
  expect(node1.getInput().filters.length).toBe(1);
  expect(embeddable.getInput().filters.length).toBe(1);
  expect(node2.getInput().filters.length).toBe(1);
});

test('ApplyFilterAction is incompatible if the root container does not accept a filter as input', async () => {
  const { doStart, setup } = testPlugin();

  const factory = new FilterableEmbeddableFactory();
  setup.registerEmbeddableFactory(factory.type, factory);
  const api = doStart();
  const applyFilterAction = createFilterAction();

  const parent = new HelloWorldContainer({ id: 'root', panels: {} }, {
    getEmbeddableFactory: api.getEmbeddableFactory,
  } as any);
  const embeddable = await parent.addNewEmbeddable<
    FilterableContainerInput,
    EmbeddableOutput,
    FilterableContainer
  >(FILTERABLE_EMBEDDABLE, { id: 'leaf' });

  if (isErrorEmbeddable(embeddable)) {
    throw new Error();
  }

  // @ts-ignore
  expect(await applyFilterAction.isCompatible({ embeddable })).toBe(false);
});

test('trying to execute on incompatible context throws an error ', async () => {
  const { doStart, setup } = testPlugin();

  const factory = new FilterableEmbeddableFactory();
  setup.registerEmbeddableFactory(factory.type, factory);

  const api = doStart();
  const applyFilterAction = createFilterAction();

  const parent = new HelloWorldContainer({ id: 'root', panels: {} }, {
    getEmbeddableFactory: api.getEmbeddableFactory,
  } as any);

  const embeddable = await parent.addNewEmbeddable<
    FilterableContainerInput,
    EmbeddableOutput,
    FilterableContainer
  >(FILTERABLE_EMBEDDABLE, { id: 'leaf' });

  if (isErrorEmbeddable(embeddable)) {
    throw new Error();
  }

  async function check() {
    await applyFilterAction.execute({ embeddable } as any);
  }
  await expect(check()).rejects.toThrow(Error);
});

test('gets title', async () => {
  const applyFilterAction = createFilterAction();
  expect(applyFilterAction.getDisplayName({} as any)).toBeDefined();
});
