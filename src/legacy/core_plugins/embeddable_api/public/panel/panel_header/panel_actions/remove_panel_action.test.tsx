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

jest.mock('ui/capabilities', () => ({
  uiCapabilities: {
    visualize: {
      save: true,
    },
  },
}));

import {
  FilterableContainer,
  FilterableEmbeddable,
  FilterableEmbeddableFactory,
  HelloWorldEmbeddable,
} from '../../../__test__/index';

import { EmbeddableFactoryRegistry, isErrorEmbeddable } from '../../../';
import { RemovePanelAction } from './remove_panel_action';
import {
  FilterableEmbeddableInput,
  FILTERABLE_EMBEDDABLE,
} from 'plugins/embeddable_api/__test__/embeddables/filterable_embeddable';

const embeddableFactories = new EmbeddableFactoryRegistry();
embeddableFactories.registerFactory(new FilterableEmbeddableFactory());

let container: FilterableContainer;
let embeddable: FilterableEmbeddable;

beforeEach(async () => {
  const derivedFilter = {
    meta: { disabled: false },
    query: { query: 'name' },
  };
  container = new FilterableContainer(
    { id: 'hello', panels: {}, filters: [derivedFilter] },
    embeddableFactories
  );

  const filterableEmbeddable = await container.addNewEmbeddable<
    FilterableEmbeddableInput,
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
      embeddable: new HelloWorldEmbeddable({ firstName: 'sue', id: '123' }),
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
  expect(action.getTitle()).toBeDefined();
});

test('Returns an icon', async () => {
  const action = new RemovePanelAction();
  expect(action.getIcon()).toBeDefined();
});
