/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line max-classes-per-file
import { createAction, createReducer, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Store } from 'redux';
import {
  defaultEmbeddableFactoryProvider,
  Container,
  ContainerInput,
  Embeddable,
  EmbeddableInput,
  EmbeddableOutput,
} from '../lib';
import { createStore, State } from './create_store';
import { input } from './input_slice';
import { output } from './output_slice';

interface TestEmbeddableInput extends EmbeddableInput {
  custom?: string;
}

interface TestEmbeddableOutput extends EmbeddableOutput {
  custom?: string;
}

interface TestContainerInput extends ContainerInput {
  custom?: string;
}

class TestEmbeddable extends Embeddable<TestEmbeddableInput, TestEmbeddableOutput> {
  type = 'test';
  reload = jest.fn();
  render = jest.fn();
}

class TestContainer extends Container<Partial<TestEmbeddableInput>, TestContainerInput> {
  type = 'test';

  getInheritedInput() {
    return {
      custom: this.input.custom,
    };
  }
}

describe('createStore', () => {
  let embeddable: TestEmbeddable;
  let store: Store<State<TestEmbeddable>>;

  beforeEach(() => {
    embeddable = new TestEmbeddable({ id: '12345' }, { title: 'Test' });
    store = createStore(embeddable);
  });

  it('should populate the state with the embeddable input', () => {
    expect(store.getState()).toHaveProperty('input', expect.objectContaining({ id: '12345' }));
  });

  it('should populate the state with the embeddable output', () => {
    expect(store.getState()).toHaveProperty('output', expect.objectContaining({ title: 'Test' }));
  });

  it('should update the embeddable input on action dispatch', () => {
    store.dispatch(input.actions.setTitle('Something'));

    expect(store.getState()).toHaveProperty('input.title', 'Something');
  });

  it('should update the embeddable output on action dispatch', () => {
    store.dispatch(output.actions.setTitle('Something'));

    expect(store.getState()).toHaveProperty('output.title', 'Something');
  });

  it('should group input updates on multiple dispatch calls', async () => {
    jest.spyOn(embeddable, 'updateInput');
    store.dispatch(input.actions.setTitle('Something'));
    store.dispatch(input.actions.setHidePanelTitles(true));
    await new Promise((resolve) => setTimeout(resolve));

    expect(embeddable.updateInput).toHaveBeenCalledTimes(1);
    expect(embeddable.updateInput).nthCalledWith(
      1,
      expect.objectContaining({ title: 'Something', hidePanelTitles: true })
    );
  });

  it('should group output updates on multiple dispatch calls', async () => {
    jest.spyOn(embeddable, 'updateOutput');
    store.dispatch(output.actions.setTitle('Something'));
    store.dispatch(output.actions.setLoading(true));
    await new Promise((resolve) => setTimeout(resolve));

    expect(embeddable.updateOutput).toHaveBeenCalledTimes(1);
    expect(embeddable.updateOutput).nthCalledWith(
      1,
      expect.objectContaining({ title: 'Something', loading: true })
    );
  });

  it('should not update input on output changes', async () => {
    jest.spyOn(embeddable, 'updateInput');
    store.dispatch(output.actions.setTitle('Something'));
    await new Promise((resolve) => setTimeout(resolve));

    expect(embeddable.updateInput).not.toHaveBeenCalled();
  });

  it('should sync input changes', () => {
    jest.spyOn(embeddable, 'updateInput');
    embeddable.updateInput({ title: 'Something' });

    expect(embeddable.updateInput).toHaveBeenCalledTimes(1);
    expect(store.getState()).toHaveProperty('input.title', 'Something');
  });

  it('should sync output changes', () => {
    jest.spyOn(embeddable, 'updateOutput');
    embeddable.updateOutput({ title: 'Something' });

    expect(embeddable.updateOutput).toHaveBeenCalledTimes(1);
    expect(store.getState()).toHaveProperty('output.title', 'Something');
  });

  it('should provide a way to use a custom reducer', async () => {
    const setCustom = createAction<string>('custom');
    const customStore = createStore(embeddable, {
      reducer: {
        input: createReducer({} as TestEmbeddableInput, (builder) =>
          builder.addCase(setCustom, (state, action) => ({ ...state, custom: action.payload }))
        ),
      },
    });

    jest.spyOn(embeddable, 'updateInput');
    customStore.dispatch(input.actions.setTitle('Something'));
    customStore.dispatch(setCustom('Something else'));
    await new Promise((resolve) => setTimeout(resolve));

    expect(embeddable.updateInput).toHaveBeenCalledWith(
      expect.objectContaining({ custom: 'Something else', title: 'Something' })
    );
  });

  it('should provide a way to use a custom slice', async () => {
    const slice = createSlice({
      name: 'test',
      initialState: {} as State<TestEmbeddable>,
      reducers: {
        setCustom(state, action: PayloadAction<TestEmbeddableInput['custom']>) {
          state.input.custom = action.payload;
          state.output.custom = action.payload;
        },
      },
    });
    const customStore = createStore(embeddable, { reducer: slice.reducer });

    jest.spyOn(embeddable, 'updateInput');
    jest.spyOn(embeddable, 'updateOutput');
    customStore.dispatch(input.actions.setTitle('Something'));
    customStore.dispatch(slice.actions.setCustom('Something else'));
    await new Promise((resolve) => setTimeout(resolve));

    expect(embeddable.updateInput).toHaveBeenCalledWith(
      expect.objectContaining({ custom: 'Something else', title: 'Something' })
    );
    expect(embeddable.updateOutput).toHaveBeenCalledWith(
      expect.objectContaining({ custom: 'Something else' })
    );
  });

  describe('of a nested embeddable', () => {
    const factory = defaultEmbeddableFactoryProvider<
      TestEmbeddableInput,
      TestEmbeddableOutput,
      TestEmbeddable
    >({
      type: 'test',
      getDisplayName: () => 'Test',
      isEditable: async () => true,
      create: async (data, parent) => new TestEmbeddable(data, {}, parent),
    });
    const getFactory = jest.fn().mockReturnValue(factory);

    let container: TestContainer;

    beforeEach(async () => {
      container = new TestContainer(
        { custom: 'something', id: 'id', panels: {} },
        { embeddableLoaded: {} },
        getFactory
      );
      embeddable = (await container.addNewEmbeddable('test', { id: '12345' })) as TestEmbeddable;
      store = createStore(embeddable);
    });

    it('should populate inherited input', () => {
      expect(store.getState()).toHaveProperty('input.custom', 'something');
    });

    it('should override inherited input on dispatch', async () => {
      store.dispatch(
        input.actions.update({ custom: 'something else' } as Partial<TestEmbeddableInput>)
      );
      await new Promise((resolve) => setTimeout(resolve));

      expect(store.getState()).toHaveProperty('input.custom', 'something else');
      expect(container.getInput()).not.toHaveProperty('input.custom');
    });

    it('should restore value from the inherited input', async () => {
      store.dispatch(
        input.actions.update({ custom: 'something else' } as Partial<TestEmbeddableInput>)
      );
      await new Promise((resolve) => setTimeout(resolve));
      store.dispatch(input.actions.update({ custom: undefined } as Partial<TestEmbeddableInput>));
      await new Promise((resolve) => setTimeout(resolve));

      expect(store.getState()).toHaveProperty('input.custom', 'something');
    });

    it('should not override inherited input on dispatch', async () => {
      store.dispatch(input.actions.setTitle('Something'));
      await new Promise((resolve) => setTimeout(resolve));
      container.updateInput({ custom: 'something else' });

      expect(store.getState()).toHaveProperty(
        'input',
        expect.objectContaining({
          title: 'Something',
          custom: 'something else',
        })
      );
    });
  });
});
