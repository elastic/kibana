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

import { skip } from 'rxjs/operators';
import { testPlugin } from './test_plugin';
import {
  FILTERABLE_EMBEDDABLE,
  FilterableEmbeddableInput,
} from '../lib/test_samples/embeddables/filterable_embeddable';
import { FilterableEmbeddableFactory } from '../lib/test_samples/embeddables/filterable_embeddable_factory';
import { CONTACT_CARD_EMBEDDABLE } from '../lib/test_samples/embeddables/contact_card/contact_card_embeddable_factory';
import { SlowContactCardEmbeddableFactory } from '../lib/test_samples/embeddables/contact_card/slow_contact_card_embeddable_factory';
import {
  HELLO_WORLD_EMBEDDABLE,
  HelloWorldEmbeddableFactory,
} from '../../../../../examples/embeddable_examples/public';
import { FilterableContainer } from '../lib/test_samples/embeddables/filterable_container';
import { isErrorEmbeddable } from '../lib';
import { HelloWorldContainer } from '../lib/test_samples/embeddables/hello_world_container';
// eslint-disable-next-line
import { coreMock } from '../../../../core/public/mocks';
import { esFilters, Filter } from '../../../../plugins/data/public';

const { setup, doStart, coreStart, uiActions } = testPlugin(
  coreMock.createSetup(),
  coreMock.createStart()
);
const start = doStart();

setup.registerEmbeddableFactory(FILTERABLE_EMBEDDABLE, new FilterableEmbeddableFactory());
const factory = new SlowContactCardEmbeddableFactory({
  loadTickCount: 2,
  execAction: uiActions.executeTriggerActions,
});
setup.registerEmbeddableFactory(CONTACT_CARD_EMBEDDABLE, factory);
setup.registerEmbeddableFactory(HELLO_WORLD_EMBEDDABLE, new HelloWorldEmbeddableFactory());

test('Explicit embeddable input mapped to undefined will default to inherited', async () => {
  const derivedFilter: Filter = {
    $state: { store: esFilters.FilterStateStore.APP_STATE },
    meta: { disabled: false, alias: 'name', negate: false },
    query: { match: {} },
  };
  const container = new FilterableContainer(
    { id: 'hello', panels: {}, filters: [derivedFilter] },
    start.getEmbeddableFactory
  );
  const embeddable = await container.addNewEmbeddable<any, any, any>(FILTERABLE_EMBEDDABLE, {});

  if (isErrorEmbeddable(embeddable)) {
    throw new Error('Error adding embeddable');
  }

  embeddable.updateInput({ filters: [] });

  expect(container.getInputForChild<FilterableEmbeddableInput>(embeddable.id).filters).toEqual([]);

  embeddable.updateInput({ filters: undefined });

  expect(container.getInputForChild<FilterableEmbeddableInput>(embeddable.id).filters).toEqual([
    derivedFilter,
  ]);
});

test('Explicit embeddable input mapped to undefined with no inherited value will get passed to embeddable', async done => {
  const container = new HelloWorldContainer(
    { id: 'hello', panels: {} },
    {
      getActions: uiActions.getTriggerCompatibleActions,
      getAllEmbeddableFactories: start.getEmbeddableFactories,
      getEmbeddableFactory: start.getEmbeddableFactory,
      notifications: coreStart.notifications,
      overlays: coreStart.overlays,
      inspector: {} as any,
      SavedObjectFinder: () => null,
    }
  );

  const embeddable = await container.addNewEmbeddable<any, any, any>(FILTERABLE_EMBEDDABLE, {});

  if (isErrorEmbeddable(embeddable)) {
    throw new Error('Error adding embeddable');
  }

  embeddable.updateInput({ filters: [] });

  expect(container.getInputForChild<FilterableEmbeddableInput>(embeddable.id).filters).toEqual([]);

  const subscription = embeddable
    .getInput$()
    .pipe(skip(1))
    .subscribe(() => {
      if (embeddable.getInput().filters === undefined) {
        subscription.unsubscribe();
        done();
      }
    });

  embeddable.updateInput({ filters: undefined });
});

// The goal is to make sure that if the container input changes after `onPanelAdded` is called
// but before the embeddable factory returns the embeddable, that the `inheritedChildInput` and
// embeddable input comparisons won't cause explicit input to be set when it shouldn't.
test('Explicit input tests in async situations', (done: () => void) => {
  const container = new HelloWorldContainer(
    {
      id: 'hello',
      panels: {
        '123': {
          explicitInput: { firstName: 'Sam', id: '123' },
          type: CONTACT_CARD_EMBEDDABLE,
        },
      },
    },
    {
      getActions: uiActions.getTriggerCompatibleActions,
      getAllEmbeddableFactories: start.getEmbeddableFactories,
      getEmbeddableFactory: start.getEmbeddableFactory,
      notifications: coreStart.notifications,
      overlays: coreStart.overlays,
      inspector: {} as any,
      SavedObjectFinder: () => null,
    }
  );

  container.updateInput({ lastName: 'lolol' });

  const subscription = container.getOutput$().subscribe(() => {
    if (container.getOutput().embeddableLoaded['123']) {
      const embeddable = container.getChild<any>('123');
      expect(embeddable).toBeDefined();
      expect(embeddable.getInput().lastName).toBe('lolol');
      subscription.unsubscribe();
      done();
    }
  });
});
