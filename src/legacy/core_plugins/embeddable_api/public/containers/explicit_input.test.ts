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

import '../ui_capabilities.test.mocks';

import { skip } from 'rxjs/operators';
import {
  CONTACT_CARD_EMBEDDABLE,
  HelloWorldContainer,
  FilterableContainer,
  FILTERABLE_EMBEDDABLE,
  FilterableEmbeddableFactory,
  ContactCardEmbeddable,
  SlowContactCardEmbeddableFactory,
  HELLO_WORLD_EMBEDDABLE_TYPE,
  HelloWorldEmbeddableFactory,
} from '../test_samples/index';
import { isErrorEmbeddable, EmbeddableOutput, EmbeddableFactory } from '../embeddables';
import {
  FilterableEmbeddableInput,
  FilterableEmbeddable,
} from '../test_samples/embeddables/filterable_embeddable';
import { Filter, FilterStateStore } from '@kbn/es-query';

jest.mock('ui/new_platform');

const embeddableFactories = new Map<string, EmbeddableFactory>();
embeddableFactories.set(FILTERABLE_EMBEDDABLE, new FilterableEmbeddableFactory());
embeddableFactories.set(
  CONTACT_CARD_EMBEDDABLE,
  new SlowContactCardEmbeddableFactory({ loadTickCount: 2 })
);
embeddableFactories.set(HELLO_WORLD_EMBEDDABLE_TYPE, new HelloWorldEmbeddableFactory());

test('Explicit embeddable input mapped to undefined will default to inherited', async () => {
  const derivedFilter: Filter = {
    $state: { store: FilterStateStore.APP_STATE },
    meta: { disabled: false, alias: 'name', negate: false },
    query: { match: {} },
  };
  const container = new FilterableContainer(
    { id: 'hello', panels: {}, filters: [derivedFilter] },
    embeddableFactories
  );
  const embeddable = await container.addNewEmbeddable<
    FilterableEmbeddableInput,
    EmbeddableOutput,
    FilterableEmbeddable
  >(FILTERABLE_EMBEDDABLE, {});

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
  const container = new HelloWorldContainer({ id: 'hello', panels: {} }, embeddableFactories);

  const embeddable = await container.addNewEmbeddable<
    FilterableEmbeddableInput,
    EmbeddableOutput,
    FilterableEmbeddable
  >(FILTERABLE_EMBEDDABLE, {});

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
      lastName: 'bar',
    },
    embeddableFactories
  );

  container.updateInput({ lastName: 'lolol' });

  const subscription = container.getOutput$().subscribe(() => {
    if (container.getOutput().embeddableLoaded['123']) {
      expect(container.getInput().panels['123'].explicitInput.lastName).toBeUndefined();
      const embeddable = container.getChild<ContactCardEmbeddable>('123');
      expect(embeddable).toBeDefined();
      expect(embeddable.getInput().lastName).toBe('lolol');
      subscription.unsubscribe();
      done();
    }
  });
});
