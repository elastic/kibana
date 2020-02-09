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

import { InspectPanelAction } from './inspect_panel_action';
import {
  FilterableContainer,
  FILTERABLE_EMBEDDABLE,
  FilterableEmbeddableFactory,
  FilterableEmbeddableInput,
  FilterableEmbeddable,
  ContactCardEmbeddable,
} from '../../../test_samples';
// eslint-disable-next-line
import { inspectorPluginMock } from 'src/plugins/inspector/public/mocks';
import {
  EmbeddableFactory,
  EmbeddableOutput,
  isErrorEmbeddable,
  ErrorEmbeddable,
} from '../../../embeddables';
import { GetEmbeddableFactory } from '../../../types';
import { of } from '../../../../tests/helpers';
import { esFilters } from '../../../../../../../plugins/data/public';

const setup = async () => {
  const embeddableFactories = new Map<string, EmbeddableFactory>();
  embeddableFactories.set(FILTERABLE_EMBEDDABLE, new FilterableEmbeddableFactory());
  const getFactory: GetEmbeddableFactory = (id: string) => embeddableFactories.get(id);
  const container = new FilterableContainer(
    {
      id: 'hello',
      panels: {},
      filters: [
        {
          $state: { store: esFilters.FilterStateStore.APP_STATE },
          meta: { disabled: false, alias: 'name', negate: false },
          query: { match: {} },
        },
      ],
    },
    getFactory
  );

  const embeddable: FilterableEmbeddable | ErrorEmbeddable = await container.addNewEmbeddable<
    FilterableEmbeddableInput,
    EmbeddableOutput,
    FilterableEmbeddable
  >(FILTERABLE_EMBEDDABLE, {
    id: '123',
  });

  if (isErrorEmbeddable(embeddable)) {
    throw new Error('Error creating new filterable embeddable');
  }

  return {
    embeddable,
    container,
  };
};

test('Is compatible when inspector adapters are available', async () => {
  const inspector = inspectorPluginMock.createStartContract();
  inspector.isAvailable.mockImplementation(() => true);

  const { embeddable } = await setup();
  const inspectAction = new InspectPanelAction(inspector);

  expect(await inspectAction.isCompatible({ embeddable })).toBe(true);
  expect(inspector.isAvailable).toHaveBeenCalledTimes(1);
  expect(inspector.isAvailable.mock.calls[0][0]).toMatchObject({
    filters: expect.any(String),
  });
});

test('Is not compatible when inspector adapters are not available', async () => {
  const inspector = inspectorPluginMock.createStartContract();
  inspector.isAvailable.mockImplementation(() => false);
  const inspectAction = new InspectPanelAction(inspector);

  expect(
    await inspectAction.isCompatible({
      embeddable: new ContactCardEmbeddable(
        {
          firstName: 'Davos',
          lastName: 'Seaworth',
          id: '123',
        },
        { execAction: () => Promise.resolve(undefined) }
      ),
    })
  ).toBe(false);
  expect(inspector.isAvailable).toHaveBeenCalledTimes(1);
  expect(inspector.isAvailable.mock.calls[0][0]).toMatchInlineSnapshot(`undefined`);
});

test('Executes when inspector adapters are available', async () => {
  const inspector = inspectorPluginMock.createStartContract();
  inspector.isAvailable.mockImplementation(() => true);

  const { embeddable } = await setup();
  const inspectAction = new InspectPanelAction(inspector);

  expect(inspector.open).toHaveBeenCalledTimes(0);

  await inspectAction.execute({ embeddable });

  expect(inspector.open).toHaveBeenCalledTimes(1);
});

test('Execute throws an error when inspector adapters are not available', async () => {
  const inspector = inspectorPluginMock.createStartContract();
  inspector.isAvailable.mockImplementation(() => false);
  const inspectAction = new InspectPanelAction(inspector);

  const [, error] = await of(
    inspectAction.execute({
      embeddable: new ContactCardEmbeddable(
        {
          firstName: 'John',
          lastName: 'Snow',
          id: '123',
        },
        { execAction: () => Promise.resolve(undefined) }
      ),
    })
  );

  expect(error).toBeInstanceOf(Error);
  expect(error.message).toMatchInlineSnapshot(`"Action not compatible with context"`);
});

test('Returns title', async () => {
  const inspector = inspectorPluginMock.createStartContract();
  const inspectAction = new InspectPanelAction(inspector);
  expect(inspectAction.getDisplayName()).toBe('Inspect');
});

test('Returns an icon', async () => {
  const inspector = inspectorPluginMock.createStartContract();
  const inspectAction = new InspectPanelAction(inspector);
  expect(inspectAction.getIconType()).toBe('inspect');
});
