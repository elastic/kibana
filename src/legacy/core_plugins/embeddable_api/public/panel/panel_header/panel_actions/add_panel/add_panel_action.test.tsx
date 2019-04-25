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

jest.mock('ui/new_platform', () => ({
  getNewPlatform: () => ({
    start: {
      core: {
        overlays: {
          openFlyout: jest.fn(),
        },
      },
    },
  }),
}));

import {
  FilterableContainer,
  FilterableEmbeddable,
  FilterableEmbeddableFactory,
  HelloWorldEmbeddable,
  FilterableContainerInput,
} from '../../../../__test__/index';

import { EmbeddableFactoryRegistry, isErrorEmbeddable } from '../../../../';
import { AddPanelAction } from './add_panel_action';
import {
  FilterableEmbeddableInput,
  FILTERABLE_EMBEDDABLE,
} from 'plugins/embeddable_api/__test__/embeddables/filterable_embeddable';
import { ViewMode } from 'plugins/embeddable_api/types';

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

  if (isErrorEmbeddable<FilterableEmbeddable>(filterableEmbeddable)) {
    throw new Error('Error creating new filterable embeddable');
  } else {
    embeddable = filterableEmbeddable;
  }
});

test('Is not compatible when container is in view mode', async () => {
  const action = new AddPanelAction();
  container.updateInput({ viewMode: ViewMode.VIEW });
  expect(await action.isCompatible<FilterableContainer>({ embeddable: container })).toBe(false);
});

test('Is not compatible when embeddable is not a container', async () => {
  const action = new AddPanelAction();
  expect(
    await action.isCompatible({
      embeddable,
    })
  ).toBe(false);
});

test('Is compatible when embeddable is in a parent and in edit mode', async () => {
  const action = new AddPanelAction();
  embeddable.updateInput({ viewMode: ViewMode.EDIT });
  expect(await action.isCompatible({ embeddable: container })).toBe(true);
});

test('Execute throws an error when called with an embeddable that is not a container', async () => {
  const action = new AddPanelAction();
  async function check() {
    await action.execute({
      // @ts-ignore
      embeddable: new HelloWorldEmbeddable({
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
  await action.execute({
    embeddable: container,
  });
});

test('Returns title', async () => {
  const action = new AddPanelAction();
  expect(action.getTitle()).toBeDefined();
});

test('Returns an icon', async () => {
  const action = new AddPanelAction();
  expect(action.getIcon()).toBeDefined();
});
