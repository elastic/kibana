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

jest.mock('ui/inspector', () => ({
  Inspector: {
    open: jest.fn(() => ({
      onClose: Promise.resolve(),
    })),
    isAvailable: (adapters: Adapters) => {
      return Boolean(adapters);
    },
  },
}));

import {
  FilterableContainer,
  FilterableEmbeddable,
  FilterableEmbeddableFactory,
  ContactCardEmbeddable,
  FilterableEmbeddableInput,
  FILTERABLE_EMBEDDABLE,
} from '../../../test_samples';

import { EmbeddableOutput, isErrorEmbeddable } from '../../..';
import { InspectPanelAction } from './inspect_panel_action';
import { Inspector, Adapters } from 'ui/inspector';
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

test('Is compatible when inspector adapters are available', async () => {
  const inspectAction = new InspectPanelAction();
  expect(await inspectAction.isCompatible({ embeddable })).toBe(true);
});

test('Is not compatible when inspector adapters are not available', async () => {
  const inspectAction = new InspectPanelAction();
  expect(
    await inspectAction.isCompatible({
      embeddable: new ContactCardEmbeddable({
        firstName: 'Davos',
        lastName: 'Seaworth',
        id: '123',
      }),
    })
  ).toBe(false);
});

test('Executes when inspector adapters are available', async () => {
  const inspectAction = new InspectPanelAction();
  await inspectAction.execute({ embeddable });
  expect(Inspector.open).toBeCalled();
});

test('Execute throws an error when inspector adapters are not available', async () => {
  const inspectAction = new InspectPanelAction();
  await inspectAction.execute({ embeddable });

  await expect(
    inspectAction.execute({
      embeddable: new ContactCardEmbeddable({
        firstName: 'John',
        lastName: 'Snow',
        id: '123',
      }),
    })
  ).rejects.toThrow(Error);
});

test('Returns title', async () => {
  const inspectAction = new InspectPanelAction();
  expect(inspectAction.getDisplayName()).toBeDefined();
});

test('Returns an icon', async () => {
  const inspectAction = new InspectPanelAction();
  expect(inspectAction.getIcon()).toBeDefined();
});
