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

import '../np_core.test.mocks';

import * as Rx from 'rxjs';
import { skip } from 'rxjs/operators';
import {
  CONTACT_CARD_EMBEDDABLE,
  HelloWorldContainer,
  FilterableContainer,
  FILTERABLE_EMBEDDABLE,
  FilterableEmbeddableFactory,
  FilterableContainerInput,
  ContactCardEmbeddable,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  SlowContactCardEmbeddableFactory,
  HELLO_WORLD_EMBEDDABLE_TYPE,
  HelloWorldEmbeddableFactory,
} from '../test_samples/index';
import { isErrorEmbeddable, EmbeddableOutput, EmbeddableFactory } from '../embeddables';
import { ContainerInput } from './i_container';
import { ViewMode } from '../types';
import { createRegistry } from '../create_registry';
import {
  FilterableEmbeddableInput,
  FilterableEmbeddable,
} from '../test_samples/embeddables/filterable_embeddable';
import { ERROR_EMBEDDABLE_TYPE } from '../embeddables/error_embeddable';
import { Filter, FilterStateStore } from '@kbn/es-query';
import { PanelNotFoundError } from './panel_not_found_error';

const embeddableFactories = createRegistry<EmbeddableFactory>();
embeddableFactories.set(FILTERABLE_EMBEDDABLE, new FilterableEmbeddableFactory());
embeddableFactories.set(CONTACT_CARD_EMBEDDABLE, new SlowContactCardEmbeddableFactory());
embeddableFactories.set(HELLO_WORLD_EMBEDDABLE_TYPE, new HelloWorldEmbeddableFactory());

async function creatHelloWorldContainerAndEmbeddable(
  containerInput: ContainerInput = { id: 'hello', panels: {} },
  embeddableInput = {}
) {
  const container = new HelloWorldContainer(containerInput, embeddableFactories);
  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, embeddableInput);

  if (isErrorEmbeddable(embeddable)) {
    throw new Error('Error adding embeddable');
  }

  return { container, embeddable };
}

test('Container initializes embeddables', async done => {
  const container = new HelloWorldContainer(
    {
      id: 'hello',
      panels: {
        '123': {
          explicitInput: { firstName: 'Sam', lastName: 'Tarley', id: '123' },
          type: CONTACT_CARD_EMBEDDABLE,
        },
      },
    },
    embeddableFactories
  );

  const subscription = container.getOutput$().subscribe(() => {
    if (container.getOutput().embeddableLoaded['123']) {
      const embeddable = container.getChild<ContactCardEmbeddable>('123');
      expect(embeddable).toBeDefined();
      expect(embeddable.id).toBe('123');
      subscription.unsubscribe();
      done();
    }
  });

  if (container.getOutput().embeddableLoaded['123']) {
    const embeddable = container.getChild<ContactCardEmbeddable>('123');
    expect(embeddable).toBeDefined();
    expect(embeddable.id).toBe('123');
    done();
  }
});

test('Container.addNewEmbeddable', async () => {
  const { container, embeddable } = await creatHelloWorldContainerAndEmbeddable(
    { id: 'hello', panels: {} },
    {
      firstName: 'Susy',
    }
  );
  expect(embeddable).toBeDefined();

  if (!isErrorEmbeddable(embeddable)) {
    expect(embeddable.getInput().firstName).toBe('Susy');
  } else {
    expect(false).toBe(true);
  }

  const embeddableInContainer = container.getChild<ContactCardEmbeddable>(embeddable.id);
  expect(embeddableInContainer).toBeDefined();
  expect(embeddableInContainer.id).toBe(embeddable.id);
});

test('Container.removeEmbeddable removes and cleans up', async done => {
  const container = new HelloWorldContainer(
    {
      id: 'hello',
      panels: {
        '123': {
          explicitInput: { id: '123', firstName: 'Sam', lastName: 'Tarley' },
          type: CONTACT_CARD_EMBEDDABLE,
        },
      },
    },
    embeddableFactories
  );
  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Susy',
    lastName: 'Q',
  });

  if (isErrorEmbeddable(embeddable)) {
    expect(false).toBe(true);
    return;
  }

  embeddable.updateInput({ lastName: 'Z' });

  container
    .getOutput$()
    .pipe(skip(1))
    .subscribe(() => {
      const noFind = container.getChild<ContactCardEmbeddable>(embeddable.id);
      expect(noFind).toBeUndefined();

      expect(container.getInput().panels[embeddable.id]).toBeUndefined();
      if (isErrorEmbeddable(embeddable)) {
        expect(false).toBe(true);
        done();
      }

      expect(() => embeddable.updateInput({ nameTitle: 'Sir' })).toThrowError();
      expect(container.getOutput().embeddableLoaded[embeddable.id]).toBeUndefined();
      done();
    });

  container.removeEmbeddable(embeddable.id);
});

test('Container.input$ is notified when child embeddable input is updated', async () => {
  const { container, embeddable } = await creatHelloWorldContainerAndEmbeddable(
    { id: 'hello', panels: {} },
    {
      firstName: 'Susy',
      lastName: 'Q',
    }
  );

  if (isErrorEmbeddable(embeddable)) {
    expect(false).toBe(true);
    return;
  }

  const changes = jest.fn();
  const subscription = container.getInput$().subscribe(changes);

  embeddable.updateInput({ lastName: 'Z' });

  expect(changes).toBeCalledTimes(2);

  expect(embeddable.getInput().lastName === 'Z');

  embeddable.updateInput({ lastName: embeddable.getOutput().originalLastName });

  expect(embeddable.getInput().lastName === 'Q');

  expect(changes).toBeCalledTimes(3);

  subscription.unsubscribe();

  embeddable.updateInput({ nameTitle: 'Dr.' });

  expect(changes).toBeCalledTimes(3);
});

test('Container.input$', async () => {
  const { container, embeddable } = await creatHelloWorldContainerAndEmbeddable(
    { id: 'hello', panels: {} },
    {
      firstName: 'Susy',
      id: 'Susy',
    }
  );

  if (isErrorEmbeddable(embeddable)) {
    expect(false).toBe(true);
    return;
  }

  const changes = jest.fn();
  const input = container.getInput();
  expect(input.panels[embeddable.id].explicitInput).toEqual({ firstName: 'Susy', id: 'Susy' });

  const subscription = container.getInput$().subscribe(changes);
  embeddable.updateInput({ nameTitle: 'Dr.' });
  expect(container.getInput().panels[embeddable.id].explicitInput).toEqual({
    nameTitle: 'Dr.',
    firstName: 'Susy',
    id: 'Susy',
  });
  subscription.unsubscribe();
});

test('Container.getInput$ not triggered if state is the same', async () => {
  const { container, embeddable } = await creatHelloWorldContainerAndEmbeddable(
    { id: 'hello', panels: {} },
    {
      firstName: 'Susy',
      id: 'Susy',
    }
  );

  if (isErrorEmbeddable(embeddable)) {
    expect(false).toBe(true);
    return;
  }

  const changes = jest.fn();
  const input = container.getInput();
  expect(input.panels[embeddable.id].explicitInput).toEqual({
    id: 'Susy',
    firstName: 'Susy',
  });
  const subscription = container.getInput$().subscribe(changes);
  embeddable.updateInput({ nameTitle: 'Dr.' });
  expect(changes).toBeCalledTimes(2);
  embeddable.updateInput({ nameTitle: 'Dr.' });
  expect(changes).toBeCalledTimes(2);
  subscription.unsubscribe();
});

test('Container view mode change propagates to children', async () => {
  const { container, embeddable } = await creatHelloWorldContainerAndEmbeddable(
    { id: 'hello', panels: {}, viewMode: ViewMode.VIEW },
    {
      firstName: 'Susy',
      id: 'Susy',
    }
  );

  expect(embeddable.getInput().viewMode).toBe(ViewMode.VIEW);

  container.updateInput({ viewMode: ViewMode.EDIT });

  expect(embeddable.getInput().viewMode).toBe(ViewMode.EDIT);
});

test(`Container updates its state when a child's input is updated`, async done => {
  const { container, embeddable } = await creatHelloWorldContainerAndEmbeddable(
    { id: 'hello', panels: {}, viewMode: ViewMode.VIEW },
    {
      id: '123',
      firstName: 'Susy',
    }
  );

  if (isErrorEmbeddable(embeddable)) {
    throw new Error('Error adding embeddable');
  }

  const containerSubscription = Rx.merge(container.getInput$(), container.getOutput$()).subscribe(
    () => {
      const child = container.getChild<ContactCardEmbeddable>(embeddable.id);
      if (
        container.getOutput().embeddableLoaded[embeddable.id] &&
        child.getInput().nameTitle === 'Dr.'
      ) {
        containerSubscription.unsubscribe();

        // Make sure a brand new container built off the output of container also creates an embeddable
        // with "Dr.", not the default the embeddable was first added with. Makes sure changed input
        // is preserved with the container.
        const containerClone = new HelloWorldContainer(container.getInput(), embeddableFactories);
        const cloneSubscription = Rx.merge(
          containerClone.getOutput$(),
          containerClone.getInput$()
        ).subscribe(() => {
          const childClone = containerClone.getChild<ContactCardEmbeddable>(embeddable.id);

          if (
            containerClone.getOutput().embeddableLoaded[embeddable.id] &&
            childClone.getInput().nameTitle === 'Dr.'
          ) {
            cloneSubscription.unsubscribe();
            done();
          }
        });
      }
    }
  );

  embeddable.updateInput({ nameTitle: 'Dr.' });
});

test(`Derived container state passed to children`, async () => {
  const { container, embeddable } = await creatHelloWorldContainerAndEmbeddable(
    { id: 'hello', panels: {}, viewMode: ViewMode.VIEW },
    {
      firstName: 'Susy',
    }
  );

  let subscription = embeddable
    .getInput$()
    .pipe(skip(1))
    .subscribe((changes: Partial<ContactCardEmbeddableInput>) => {
      expect(changes.viewMode).toBe(ViewMode.EDIT);
    });
  container.updateInput({ viewMode: ViewMode.EDIT });

  subscription.unsubscribe();
  subscription = embeddable
    .getInput$()
    .pipe(skip(1))
    .subscribe((changes: Partial<ContactCardEmbeddableInput>) => {
      expect(changes.viewMode).toBe(ViewMode.VIEW);
    });
  container.updateInput({ viewMode: ViewMode.VIEW });
  subscription.unsubscribe();
});

test(`Can subscribe to children embeddable updates`, async done => {
  const { embeddable } = await creatHelloWorldContainerAndEmbeddable(
    {
      id: 'hello container',
      panels: {},
      viewMode: ViewMode.VIEW,
    },
    {
      firstName: 'Susy',
    }
  );

  if (isErrorEmbeddable(embeddable)) {
    throw new Error('Error adding embeddable');
  }

  const subscription = embeddable.getInput$().subscribe((input: ContactCardEmbeddableInput) => {
    if (input.nameTitle === 'Dr.') {
      subscription.unsubscribe();
      done();
    }
  });
  embeddable.updateInput({ nameTitle: 'Dr.' });
});

test('Test nested reactions', async done => {
  const { container, embeddable } = await creatHelloWorldContainerAndEmbeddable(
    { id: 'hello', panels: {}, viewMode: ViewMode.VIEW },
    {
      firstName: 'Susy',
    }
  );

  if (isErrorEmbeddable(embeddable)) {
    throw new Error('Error adding embeddable');
  }

  const containerSubscription = container.getInput$().subscribe(input => {
    const embeddableNameTitle = embeddable.getInput().nameTitle;
    const viewMode = input.viewMode;
    const nameTitleFromContainer = container.getInputForChild<ContactCardEmbeddableInput>(
      embeddable.id
    ).nameTitle;
    if (
      embeddableNameTitle === 'Dr.' &&
      nameTitleFromContainer === 'Dr.' &&
      viewMode === ViewMode.EDIT
    ) {
      containerSubscription.unsubscribe();
      embeddableSubscription.unsubscribe();
      done();
    }
  });

  const embeddableSubscription = embeddable.getInput$().subscribe(() => {
    if (embeddable.getInput().nameTitle === 'Dr.') {
      container.updateInput({ viewMode: ViewMode.EDIT });
    }
  });

  embeddable.updateInput({ nameTitle: 'Dr.' });
});

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

test('Panel removed from input state', async done => {
  const container = new FilterableContainer(
    { id: 'hello', panels: {}, filters: [] },
    embeddableFactories
  );

  const embeddable = await container.addNewEmbeddable<
    FilterableEmbeddableInput,
    EmbeddableOutput,
    FilterableEmbeddable
  >(FILTERABLE_EMBEDDABLE, {});

  const filteredPanels = { ...container.getInput().panels };
  delete filteredPanels[embeddable.id];
  const newInput: Partial<FilterableContainerInput> = {
    ...container.getInput(),
    panels: filteredPanels,
  };

  const subscription = container
    .getOutput$()
    .pipe(skip(1))
    .subscribe(() => {
      expect(container.getChild(embeddable.id)).toBeUndefined();
      expect(container.getOutput().embeddableLoaded[embeddable.id]).toBeUndefined();
      subscription.unsubscribe();
      done();
    });

  container.updateInput(newInput);
});

test('Panel added to input state', async done => {
  const container = new FilterableContainer(
    { id: 'hello', panels: {}, filters: [] },
    embeddableFactories
  );

  const embeddable = await container.addNewEmbeddable<
    FilterableEmbeddableInput,
    EmbeddableOutput,
    FilterableEmbeddable
  >(FILTERABLE_EMBEDDABLE, {});

  const embeddable2 = await container.addNewEmbeddable<
    FilterableEmbeddableInput,
    EmbeddableOutput,
    FilterableEmbeddable
  >(FILTERABLE_EMBEDDABLE, {});

  const container2 = new FilterableContainer(
    { id: 'hello', panels: {}, filters: [] },
    embeddableFactories
  );

  const subscription = container2
    .getOutput$()
    .pipe(skip(2))
    .subscribe(() => {
      expect(container.getChild(embeddable.id)).toBeDefined();
      expect(container.getOutput().embeddableLoaded[embeddable.id]).toBe(true);
      expect(container.getChild(embeddable2.id)).toBeDefined();
      expect(container.getOutput().embeddableLoaded[embeddable2.id]).toBe(true);
      subscription.unsubscribe();
      done();
    });

  // Container 1 has the panel in it's array, copy it to container2.
  container2.updateInput(container.getInput());
});

test('Container changes made directly after adding a new embeddable are propagated', async done => {
  const container = new HelloWorldContainer(
    { id: 'hello', panels: {}, viewMode: ViewMode.EDIT },
    embeddableFactories
  );

  embeddableFactories.reset();
  embeddableFactories.set(
    CONTACT_CARD_EMBEDDABLE,
    new SlowContactCardEmbeddableFactory({ loadTickCount: 3 })
  );

  const subscription = Rx.merge(container.getOutput$(), container.getInput$())
    .pipe(skip(2))
    .subscribe(() => {
      expect(Object.keys(container.getOutput().embeddableLoaded).length).toBe(1);
      if (Object.keys(container.getOutput().embeddableLoaded).length > 0) {
        const embeddableId = Object.keys(container.getOutput().embeddableLoaded)[0];

        if (container.getOutput().embeddableLoaded[embeddableId] === true) {
          const embeddable = container.getChild(embeddableId);
          if (embeddable.getInput().viewMode === ViewMode.VIEW) {
            subscription.unsubscribe();
            done();
          }
        }
      }
    });

  container.addNewEmbeddable<ContactCardEmbeddableInput>(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'A girl',
    lastName: 'has no name',
  });

  container.updateInput({ viewMode: ViewMode.VIEW });
});

test('container stores ErrorEmbeddables when a factory for a child cannot be found (so the panel can be removed)', async done => {
  const container = new HelloWorldContainer(
    {
      id: 'hello',
      panels: {
        '123': {
          type: 'IDontExist',
          explicitInput: { id: '123' },
        },
      },
      viewMode: ViewMode.EDIT,
    },
    embeddableFactories
  );

  container.getOutput$().subscribe(() => {
    if (container.getOutput().embeddableLoaded['123']) {
      const child = container.getChild('123');
      expect(child.type).toBe(ERROR_EMBEDDABLE_TYPE);
      done();
    }
  });
});

test('container stores ErrorEmbeddables when a saved object cannot be found', async done => {
  const container = new HelloWorldContainer(
    {
      id: 'hello',
      panels: {
        '123': {
          type: 'vis',
          explicitInput: { id: '123' },
          savedObjectId: '456',
        },
      },
      viewMode: ViewMode.EDIT,
    },
    embeddableFactories
  );

  container.getOutput$().subscribe(() => {
    if (container.getOutput().embeddableLoaded['123']) {
      const child = container.getChild('123');
      expect(child.type).toBe(ERROR_EMBEDDABLE_TYPE);
      done();
    }
  });
});

test('ErrorEmbeddables get updated when parent does', async done => {
  const container = new HelloWorldContainer(
    {
      id: 'hello',
      panels: {
        '123': {
          type: 'vis',
          explicitInput: { id: '123' },
          savedObjectId: '456',
        },
      },
      viewMode: ViewMode.EDIT,
    },
    embeddableFactories
  );

  container.getOutput$().subscribe(() => {
    if (container.getOutput().embeddableLoaded['123']) {
      const embeddable = container.getChild('123');

      expect(embeddable.getInput().viewMode).toBe(ViewMode.EDIT);

      container.updateInput({ viewMode: ViewMode.VIEW });

      expect(embeddable.getInput().viewMode).toBe(ViewMode.VIEW);
      done();
    }
  });
});

test('untilEmbeddableLoaded throws an error if there is no such child panel in the container', () => {
  const container = new HelloWorldContainer(
    {
      id: 'hello',
      panels: {},
    },
    embeddableFactories
  );

  expect(container.untilEmbeddableLoaded('idontexist')).rejects.toThrowError();
});

test('untilEmbeddableLoaded resolves if child is has an type that does not exist', async done => {
  embeddableFactories.reset();
  const container = new HelloWorldContainer(
    {
      id: 'hello',
      panels: {
        '123': {
          type: HELLO_WORLD_EMBEDDABLE_TYPE,
          explicitInput: { id: '123' },
        },
      },
    },
    embeddableFactories
  );

  const child = await container.untilEmbeddableLoaded('123');
  expect(child).toBeDefined();
  expect(child.type).toBe(ERROR_EMBEDDABLE_TYPE);
  done();
});

test('untilEmbeddableLoaded resolves if child is loaded in the container', async done => {
  embeddableFactories.reset();
  embeddableFactories.set(HELLO_WORLD_EMBEDDABLE_TYPE, new HelloWorldEmbeddableFactory());

  const container = new HelloWorldContainer(
    {
      id: 'hello',
      panels: {
        '123': {
          type: HELLO_WORLD_EMBEDDABLE_TYPE,
          explicitInput: { id: '123' },
        },
      },
    },
    embeddableFactories
  );

  const child = await container.untilEmbeddableLoaded('123');
  expect(child).toBeDefined();
  expect(child.type).toBe(HELLO_WORLD_EMBEDDABLE_TYPE);
  done();
});

test('untilEmbeddableLoaded rejects with an error if child is subsequently removed', async done => {
  embeddableFactories.reset();
  embeddableFactories.set(
    CONTACT_CARD_EMBEDDABLE,
    new SlowContactCardEmbeddableFactory({ loadTickCount: 3 })
  );

  const container = new HelloWorldContainer(
    {
      id: 'hello',
      panels: {
        '123': {
          explicitInput: { id: '123', firstName: 'Sam', lastName: 'Tarley' },
          type: CONTACT_CARD_EMBEDDABLE,
        },
      },
    },
    embeddableFactories
  );

  container.untilEmbeddableLoaded('123').catch(error => {
    expect(error).toBeInstanceOf(PanelNotFoundError);
    done();
  });

  container.updateInput({ panels: {} });
});
