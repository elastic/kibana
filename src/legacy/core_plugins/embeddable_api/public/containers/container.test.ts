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
import { skip } from 'rxjs/operators';
import {
  HELLO_WORLD_EMBEDDABLE,
  HelloWorldEmbeddableFactory,
  HelloWorldContainer,
  FilterableContainer,
  FILTERABLE_EMBEDDABLE,
  FilterableEmbeddableFactory,
} from '../__test__/index';
import { EmbeddableFactoryRegistry, isErrorEmbeddable } from '../embeddables';
import {
  HelloWorldEmbeddable,
  HelloWorldInput,
  HelloWorldOutput,
} from '../__test__/embeddables/hello_world_embeddable';
import { ContainerInput } from './container';
import { ViewMode } from '../types';
import {
  FilterableEmbeddableInput,
  FilterableEmbeddable,
} from '../__test__/embeddables/filterable_embeddable';

const embeddableFactories = new EmbeddableFactoryRegistry();
embeddableFactories.registerFactory(new HelloWorldEmbeddableFactory());
embeddableFactories.registerFactory(new FilterableEmbeddableFactory());

async function creatHelloWorldContainerAndEmbeddable(
  containerInput: ContainerInput = { id: 'hello', panels: {} },
  embeddableInput = {}
) {
  const container = new HelloWorldContainer(containerInput, embeddableFactories);
  const embeddable = await container.addNewEmbeddable<HelloWorldInput, HelloWorldEmbeddable>(
    HELLO_WORLD_EMBEDDABLE,
    embeddableInput
  );

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
          embeddableId: '123',
          explicitInput: { name: 'Sam' },
          type: HELLO_WORLD_EMBEDDABLE,
        },
      },
    },
    embeddableFactories
  );

  const subscription = container.getOutput$().subscribe(() => {
    if (container.getOutput().embeddableLoaded['123']) {
      const embeddable = container.getChild<HelloWorldEmbeddable>('123');
      expect(embeddable).toBeDefined();
      expect(embeddable.id).toBe('123');
      subscription.unsubscribe();
      done();
    }
  });

  if (container.getOutput().embeddableLoaded['123']) {
    const embeddable = container.getChild<HelloWorldEmbeddable>('123');
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

  const embeddableInContainer = container.getChild<HelloWorldEmbeddable>(embeddable.id);
  expect(embeddableInContainer).toBeDefined();
  expect(embeddableInContainer.id).toBe(embeddable.id);
});

test('Container.removeEmbeddable removes and cleans up', async () => {
  const container = new HelloWorldContainer(
    {
      id: 'hello',
      panels: {
        '123': {
          embeddableId: '123',
          explicitInput: { name: 'Sam' },
          type: HELLO_WORLD_EMBEDDABLE,
        },
      },
    },
    embeddableFactories
  );

  const embeddable = await container.addNewEmbeddable<
    HelloWorldInput,
    HelloWorldOutput,
    HelloWorldEmbeddable
  >(HELLO_WORLD_EMBEDDABLE, {
    firstName: 'Susy',
    lastName: 'Q',
  });

  if (isErrorEmbeddable(embeddable)) {
    expect(false).toBe(true);
    return;
  }

  embeddable.getMarried('Z');

  container.removeEmbeddable(embeddable.id);

  const noFind = container.getChild<HelloWorldInput, HelloWorldOutput, HelloWorldEmbeddable>(
    embeddable.id
  );
  expect(noFind).toBeUndefined();

  expect(container.getInput().panels[embeddable.id]).toBeUndefined();
  if (isErrorEmbeddable(embeddable)) {
    expect(false).toBe(true);
    return;
  }

  expect(embeddable.getDivorced).toThrowError();

  expect(container.getOutput().embeddableLoaded[embeddable.id]).toBeUndefined();
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

  embeddable.getMarried('Z');

  expect(changes).toBeCalledTimes(2);

  expect(embeddable.getInput().lastName === 'Z');

  embeddable.getDivorced();

  expect(embeddable.getInput().lastName === 'Q');

  expect(changes).toBeCalledTimes(3);

  subscription.unsubscribe();

  embeddable.graduateWithPhd();

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
  embeddable.graduateWithPhd();
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
  embeddable.graduateWithPhd();
  expect(changes).toBeCalledTimes(2);
  embeddable.graduateWithPhd();
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

  const inputSubscription = container.getInput$().subscribe(() => {
    const newContainer = new HelloWorldContainer(container.getInput(), embeddableFactories);
    const outputSubscription = newContainer.getOutput$().subscribe(output => {
      if (output.embeddableLoaded[embeddable.id]) {
        const newEmbeddable = newContainer.getChild<HelloWorldEmbeddable>(embeddable.id);
        expect(newEmbeddable.getInput().nameTitle).toBe('Dr.');
        outputSubscription.unsubscribe();
        inputSubscription.unsubscribe();
        done();
      }
    });
  });

  embeddable.graduateWithPhd();
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
    .subscribe((changes: Partial<HelloWorldInput>) => {
      expect(changes.viewMode).toBe(ViewMode.EDIT);
    });
  container.updateInput({ viewMode: ViewMode.EDIT });

  subscription.unsubscribe();
  subscription = embeddable
    .getInput$()
    .pipe(skip(1))
    .subscribe((changes: Partial<HelloWorldInput>) => {
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

  const subscription = embeddable.getInput$().subscribe((input: HelloWorldInput) => {
    if (input.nameTitle === 'Dr.') {
      subscription.unsubscribe();
      done();
    }
  });
  embeddable.graduateWithPhd();
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
    const nameTitleFromContainer = container.getInputForChild<HelloWorldInput>(embeddable.id)
      .nameTitle;
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

  embeddable.graduateWithPhd();
});

test('Explicit embeddable input mapped to undefined will default to inherited', async () => {
  const derivedFilter = {
    meta: { disabled: false },
    query: { query: 'name' },
  };
  const container = new FilterableContainer(
    { id: 'hello', panels: {}, filters: [derivedFilter] },
    embeddableFactories
  );
  const embeddable = await container.addNewEmbeddable<
    FilterableEmbeddableInput,
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
