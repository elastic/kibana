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

jest.mock('ui/metadata', () => ({
  metadata: {
    branch: 'my-metadata-branch',
    version: 'my-metadata-version',
  },
}));

import {
  FilterableEmbeddable,
  FilterableEmbeddableFactory,
  FilterableContainer,
  FILTERABLE_CONTAINER,
  FilterableContainerInput,
  FILTERABLE_EMBEDDABLE,
  HelloWorldContainer,
} from '../__test__/index';
import { ApplyFilterAction } from './apply_filter_action';
import { embeddableFactories, isErrorEmbeddable } from '../embeddables';
import { FilterableContainerFactory } from '../__test__/embeddables/filterable_container_factory';
import { FilterableEmbeddableInput } from '../__test__/embeddables/filterable_embeddable';

beforeAll(() => {
  embeddableFactories.registerFactory(new FilterableContainerFactory());
  embeddableFactories.registerFactory(new FilterableEmbeddableFactory());
});

afterAll(() => {
  embeddableFactories.reset();
});

test('ApplyFilterAction applies the filter to the root of the container tree', async () => {
  const applyFilterAction = new ApplyFilterAction();

  const root = new FilterableContainer(
    { id: 'root', panels: {}, filters: [] },
    embeddableFactories
  );

  const node1 = await root.addNewEmbeddable<FilterableContainerInput, FilterableContainer>(
    FILTERABLE_CONTAINER,
    { panels: {}, id: 'node1' }
  );

  const node2 = await root.addNewEmbeddable<FilterableContainerInput, FilterableContainer>(
    FILTERABLE_CONTAINER,
    { panels: {}, id: 'Node2' }
  );

  if (isErrorEmbeddable(node2) || isErrorEmbeddable(node1)) {
    throw new Error();
  }

  const embeddable = await node2.addNewEmbeddable<FilterableEmbeddableInput, FilterableEmbeddable>(
    FILTERABLE_EMBEDDABLE,
    { id: 'leaf' }
  );

  if (isErrorEmbeddable(embeddable)) {
    throw new Error();
  }

  const filter = {
    meta: {
      disabled: false,
    },
    query: {
      field: 'bird:lark',
    },
  };

  applyFilterAction.execute({ embeddable, triggerContext: { filters: [filter] } });
  expect(root.getInput().filters.length).toBe(1);
  expect(node1.getInput().filters.length).toBe(1);
  expect(embeddable.getInput().filters.length).toBe(1);
  expect(node2.getInput().filters.length).toBe(1);
});

test('ApplyFilterAction is incompatible if the root container does not accept a filter as input', async () => {
  const applyFilterAction = new ApplyFilterAction();
  const parent = new HelloWorldContainer({ id: 'root', panels: {} }, embeddableFactories);

  const embeddable = await parent.addNewEmbeddable<FilterableEmbeddableInput, FilterableEmbeddable>(
    FILTERABLE_EMBEDDABLE,
    { id: 'leaf' }
  );

  expect(await applyFilterAction.isCompatible({ embeddable })).toBe(false);
});

test('trying to execute on incompatible context throws an error ', async () => {
  const applyFilterAction = new ApplyFilterAction();
  const parent = new HelloWorldContainer({ id: 'root', panels: {} }, embeddableFactories);

  const embeddable = await parent.addNewEmbeddable<FilterableEmbeddableInput, FilterableEmbeddable>(
    FILTERABLE_EMBEDDABLE,
    { id: 'leaf' }
  );
  async function check() {
    await applyFilterAction.execute({ embeddable });
  }
  await expect(check()).rejects.toThrow(Error);
});

test('gets title', async () => {
  const applyFilterAction = new ApplyFilterAction();
  expect(applyFilterAction.getTitle()).toBeDefined();
});
