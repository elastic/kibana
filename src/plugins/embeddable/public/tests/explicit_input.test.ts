/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { skip } from 'rxjs/operators';
import { testPlugin } from './test_plugin';
import {
  MockFilter,
  FILTERABLE_EMBEDDABLE,
  FilterableEmbeddableInput,
} from '../lib/test_samples/embeddables/filterable_embeddable';
import { FilterableEmbeddableFactory } from '../lib/test_samples/embeddables/filterable_embeddable_factory';
import { CONTACT_CARD_EMBEDDABLE } from '../lib/test_samples/embeddables/contact_card/contact_card_embeddable_factory';
import { SlowContactCardEmbeddableFactory } from '../lib/test_samples/embeddables/contact_card/slow_contact_card_embeddable_factory';
import { HELLO_WORLD_EMBEDDABLE, HelloWorldEmbeddableFactoryDefinition } from './fixtures';
import { FilterableContainer } from '../lib/test_samples/embeddables/filterable_container';
import { isErrorEmbeddable } from '../lib';
import { HelloWorldContainer } from '../lib/test_samples/embeddables/hello_world_container';
import { coreMock } from '@kbn/core/public/mocks';
import { createEmbeddablePanelMock } from '../mocks';

const { setup, doStart, coreStart, uiActions } = testPlugin(
  coreMock.createSetup(),
  coreMock.createStart()
);

setup.registerEmbeddableFactory(FILTERABLE_EMBEDDABLE, new FilterableEmbeddableFactory());
const factory = new SlowContactCardEmbeddableFactory({
  loadTickCount: 2,
  execAction: uiActions.executeTriggerActions,
});
setup.registerEmbeddableFactory(CONTACT_CARD_EMBEDDABLE, factory);
setup.registerEmbeddableFactory(
  HELLO_WORLD_EMBEDDABLE,
  new HelloWorldEmbeddableFactoryDefinition()
);

const start = doStart();

test('Explicit embeddable input mapped to undefined will default to inherited', async () => {
  const derivedFilter: MockFilter = {
    $state: { store: 'appState' },
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

test('Explicit embeddable input mapped to undefined with no inherited value will get passed to embeddable', async (done) => {
  const testPanel = createEmbeddablePanelMock({
    getActions: uiActions.getTriggerCompatibleActions,
    getEmbeddableFactory: start.getEmbeddableFactory,
    getAllEmbeddableFactories: start.getEmbeddableFactories,
    overlays: coreStart.overlays,
    notifications: coreStart.notifications,
    application: coreStart.application,
  });
  const container = new HelloWorldContainer(
    { id: 'hello', panels: {} },
    {
      getEmbeddableFactory: start.getEmbeddableFactory,
      panelComponent: testPanel,
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
  const testPanel = createEmbeddablePanelMock({
    getActions: uiActions.getTriggerCompatibleActions,
    getEmbeddableFactory: start.getEmbeddableFactory,
    getAllEmbeddableFactories: start.getEmbeddableFactories,
    overlays: coreStart.overlays,
    notifications: coreStart.notifications,
    application: coreStart.application,
  });
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
      getEmbeddableFactory: start.getEmbeddableFactory,
      panelComponent: testPanel,
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
