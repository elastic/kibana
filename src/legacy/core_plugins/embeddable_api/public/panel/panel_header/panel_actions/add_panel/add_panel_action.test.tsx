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

import '../../../../np_core.test.mocks';

import {
  FilterableContainer,
  FilterableEmbeddable,
  FilterableEmbeddableFactory,
  ContactCardEmbeddable,
  FilterableEmbeddableInput,
  FILTERABLE_EMBEDDABLE,
} from '../../../../test_samples';

import { ViewMode, EmbeddableOutput, isErrorEmbeddable } from '../../../../';
import { AddPanelAction } from './add_panel_action';
import { createRegistry } from '../../../../create_registry';
import { EmbeddableFactory } from '../../../../embeddables';
import { Filter, FilterStateStore } from '@kbn/es-query';

const embeddableFactories = createRegistry<EmbeddableFactory>();
embeddableFactories.set(FILTERABLE_EMBEDDABLE, new FilterableEmbeddableFactory());

let container: FilterableContainer;
let embeddable: FilterableEmbeddable;

beforeEach(async () => {
  const derivedFilter: Filter = {
    $state: { store: FilterStateStore.APP_STATE },
    meta: { disabled: false, alias: 'name', negate: false },
    query: { match: {} },
  };
  container = new FilterableContainer(
    { id: 'hello', panels: {}, filters: [derivedFilter] },
    embeddableFactories
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
  const action = new AddPanelAction();
  container.updateInput({ viewMode: ViewMode.VIEW });
  expect(await action.isCompatible({ embeddable: container })).toBe(false);
});

test('Is not compatible when embeddable is not a container', async () => {
  const action = new AddPanelAction();
  expect(
    await action.isCompatible({
      embeddable,
    })
  ).toBe(false);
});

test('Is compatible when embeddable is a parent and in edit mode', async () => {
  const action = new AddPanelAction();
  container.updateInput({ viewMode: ViewMode.EDIT });
  expect(await action.isCompatible({ embeddable: container })).toBe(true);
});

test('Execute throws an error when called with an embeddable that is not a container', async () => {
  const action = new AddPanelAction();
  async function check() {
    await action.execute({
      // @ts-ignore
      embeddable: new ContactCardEmbeddable({
        firstName: 'sue',
        id: '123',
        viewMode: ViewMode.EDIT,
      }),
    });
  }
  await expect(check()).rejects.toThrow(Error);
});
test('Execute does not throw an error when called with a compatible container', async () => {
  const action = new AddPanelAction();
  container.updateInput({ viewMode: ViewMode.EDIT });
  await action.execute({
    embeddable: container,
  });
});

test('Returns title', async () => {
  const action = new AddPanelAction();
  expect(action.getDisplayName()).toBeDefined();
});

test('Returns an icon', async () => {
  const action = new AddPanelAction();
  expect(action.getIcon()).toBeDefined();
});
