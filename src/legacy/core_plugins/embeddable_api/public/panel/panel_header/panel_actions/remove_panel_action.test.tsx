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

import '../../../np_core.test.mocks';

import {
  FilterableContainer,
  FilterableEmbeddable,
  FilterableEmbeddableFactory,
  ContactCardEmbeddable,
  FilterableEmbeddableInput,
  FILTERABLE_EMBEDDABLE,
} from '../../../test_samples';

import { EmbeddableOutput, isErrorEmbeddable } from '../../../';
import { RemovePanelAction } from './remove_panel_action';
import { createRegistry } from '../../../create_registry';
import { EmbeddableFactory } from '../../../embeddables';
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

  if (isErrorEmbeddable(filterableEmbeddable)) {
    throw new Error('Error creating new filterable embeddable');
  } else {
    embeddable = filterableEmbeddable;
  }
});

test('Removes the embeddable', async () => {
  const removePanelAction = new RemovePanelAction();
  expect(container.getChild(embeddable.id)).toBeDefined();

  removePanelAction.execute({ embeddable });

  expect(container.getChild(embeddable.id)).toBeUndefined();
});

test('Is not compatible when embeddable is not in a parent', async () => {
  const action = new RemovePanelAction();
  expect(
    await action.isCompatible({
      embeddable: new ContactCardEmbeddable({
        firstName: 'Sandor',
        lastName: 'Clegane',
        id: '123',
      }),
    })
  ).toBe(false);
});

test('Execute throws an error when called with an embeddable not in a parent', async () => {
  const action = new RemovePanelAction();
  async function check() {
    await action.execute({ embeddable: container });
  }
  await expect(check()).rejects.toThrow(Error);
});

test('Returns title', async () => {
  const action = new RemovePanelAction();
  expect(action.getDisplayName()).toBeDefined();
});

test('Returns an icon', async () => {
  const action = new RemovePanelAction();
  expect(action.getIcon()).toBeDefined();
});
