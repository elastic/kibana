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

import { ViewMode, EmbeddableOutput, isErrorEmbeddable } from '../../../../';
import { AddPanelAction } from './add_panel_action';
import { EmbeddableFactory } from '../../../../embeddables';
import {
  FILTERABLE_EMBEDDABLE,
  FilterableEmbeddable,
  FilterableEmbeddableInput,
} from '../../../../test_samples/embeddables/filterable_embeddable';
import { FilterableEmbeddableFactory } from '../../../../test_samples/embeddables/filterable_embeddable_factory';
import { FilterableContainer } from '../../../../test_samples/embeddables/filterable_container';
import { GetEmbeddableFactory } from '../../../../types';
// eslint-disable-next-line
import { coreMock } from '../../../../../../../../core/public/mocks';
import { ContactCardEmbeddable } from '../../../../test_samples';
import { esFilters, Filter } from '../../../../../../../../plugins/data/public';

const embeddableFactories = new Map<string, EmbeddableFactory>();
embeddableFactories.set(FILTERABLE_EMBEDDABLE, new FilterableEmbeddableFactory());
const getFactory: GetEmbeddableFactory = (id: string) => embeddableFactories.get(id);

let container: FilterableContainer;
let embeddable: FilterableEmbeddable;
let action: AddPanelAction;

beforeEach(async () => {
  const start = coreMock.createStart();
  action = new AddPanelAction(
    () => undefined,
    () => [] as any,
    start.overlays,
    start.notifications,
    () => null
  );

  const derivedFilter: Filter = {
    $state: { store: esFilters.FilterStateStore.APP_STATE },
    meta: { disabled: false, alias: 'name', negate: false },
    query: { match: {} },
  };
  container = new FilterableContainer(
    { id: 'hello', panels: {}, filters: [derivedFilter] },
    getFactory
  );

  const filterableEmbeddable = await container.addNewEmbeddable<
    FilterableEmbeddableInput,
    EmbeddableOutput,
    FilterableEmbeddable
  >(FILTERABLE_EMBEDDABLE, {
    id: '123',
  });

  if (isErrorEmbeddable<FilterableEmbeddable>(filterableEmbeddable)) {
    throw new Error('Error creating new filterable embeddable');
  } else {
    embeddable = filterableEmbeddable;
  }
});

test('Is not compatible when container is in view mode', async () => {
  const start = coreMock.createStart();
  const addPanelAction = new AddPanelAction(
    () => undefined,
    () => [] as any,
    start.overlays,
    start.notifications,
    () => null
  );
  container.updateInput({ viewMode: ViewMode.VIEW });
  expect(await addPanelAction.isCompatible({ embeddable: container })).toBe(false);
});

test('Is not compatible when embeddable is not a container', async () => {
  expect(await action.isCompatible({ embeddable } as any)).toBe(false);
});

test('Is compatible when embeddable is a parent and in edit mode', async () => {
  container.updateInput({ viewMode: ViewMode.EDIT });
  expect(await action.isCompatible({ embeddable: container })).toBe(true);
});

test('Execute throws an error when called with an embeddable that is not a container', async () => {
  async function check() {
    await action.execute({
      embeddable: new ContactCardEmbeddable(
        {
          firstName: 'sue',
          id: '123',
          viewMode: ViewMode.EDIT,
        },
        {} as any
      ),
    } as any);
  }
  await expect(check()).rejects.toThrow(Error);
});
test('Execute does not throw an error when called with a compatible container', async () => {
  container.updateInput({ viewMode: ViewMode.EDIT });
  await action.execute({
    embeddable: container,
  });
});

test('Returns title', async () => {
  expect(action.getDisplayName()).toBeDefined();
});

test('Returns an icon', async () => {
  expect(action.getIconType()).toBeDefined();
});
