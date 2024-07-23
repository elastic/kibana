/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  HasRuntimeChildState,
  HasSaveNotification,
  HasSerializedChildState,
  PresentationContainer,
} from '@kbn/presentation-containers';
import { getMockPresentationContainer } from '@kbn/presentation-containers/mocks';
import { StateComparators } from '@kbn/presentation-publishing';
import { waitFor } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import { initializeReactEmbeddableState } from './react_embeddable_state';
import { ReactEmbeddableFactory } from './types';

interface SuperTestStateType {
  name: string;
  age: number;
  tagline: string;
}

describe('react embeddable unsaved changes', () => {
  let serializedStateForChild: SuperTestStateType;

  let comparators: StateComparators<SuperTestStateType>;
  let parentApi: PresentationContainer &
    HasSerializedChildState<SuperTestStateType> &
    Partial<HasRuntimeChildState<SuperTestStateType>> &
    HasSaveNotification;

  beforeEach(() => {
    serializedStateForChild = {
      name: 'Sir Testsalot',
      age: 42,
      tagline: `Oh he's a glutton for testing!`,
    };
    parentApi = {
      saveNotification$: new Subject<void>(),
      ...getMockPresentationContainer(),
      getSerializedStateForChild: () => ({ rawState: serializedStateForChild }),
      getRuntimeStateForChild: () => undefined,
    };
  });

  const initializeDefaultComparators = () => {
    const latestState: SuperTestStateType = {
      ...serializedStateForChild,
      ...(parentApi.getRuntimeStateForChild?.('uuid') ?? {}),
    };
    const nameSubject = new BehaviorSubject<string>(latestState.name);
    const ageSubject = new BehaviorSubject<number>(latestState.age);
    const taglineSubject = new BehaviorSubject<string>(latestState.tagline);
    const defaultComparators: StateComparators<SuperTestStateType> = {
      name: [nameSubject, jest.fn((nextName) => nameSubject.next(nextName))],
      age: [ageSubject, jest.fn((nextAge) => ageSubject.next(nextAge))],
      tagline: [taglineSubject, jest.fn((nextTagline) => taglineSubject.next(nextTagline))],
    };
    return defaultComparators;
  };

  const startTrackingUnsavedChanges = async (
    customComparators?: StateComparators<SuperTestStateType>
  ) => {
    comparators = customComparators ?? initializeDefaultComparators();

    const factory: ReactEmbeddableFactory<SuperTestStateType> = {
      type: 'superTest',
      deserializeState: jest.fn().mockImplementation((state) => state.rawState),
      buildEmbeddable: async (runtimeState, buildApi) => {
        const api = buildApi({ serializeState: jest.fn() }, comparators);
        return { api, Component: () => null };
      },
    };
    const { startStateDiffing } = await initializeReactEmbeddableState('uuid', factory, parentApi);
    return startStateDiffing(comparators);
  };

  it('should return undefined unsaved changes when parent API does not provide runtime state', async () => {
    const unsavedChangesApi = await startTrackingUnsavedChanges();
    parentApi.getRuntimeStateForChild = undefined;
    expect(unsavedChangesApi).toBeDefined();
    expect(unsavedChangesApi.unsavedChanges.value).toBe(undefined);
  });

  it('should return undefined unsaved changes when parent API does not have runtime state for this child', async () => {
    const unsavedChangesApi = await startTrackingUnsavedChanges();
    // no change here becuase getRuntimeStateForChild already returns undefined
    expect(unsavedChangesApi.unsavedChanges.value).toBe(undefined);
  });

  it('should return unsaved changes subject initialized to undefined when no unsaved changes are detected', async () => {
    parentApi.getRuntimeStateForChild = () => ({
      name: 'Sir Testsalot',
      age: 42,
      tagline: `Oh he's a glutton for testing!`,
    });
    const unsavedChangesApi = await startTrackingUnsavedChanges();
    expect(unsavedChangesApi.unsavedChanges.value).toBe(undefined);
  });

  it('should return unsaved changes subject initialized with diff when unsaved changes are detected', async () => {
    parentApi.getRuntimeStateForChild = () => ({
      tagline: 'Testing is my speciality!',
    });
    const unsavedChangesApi = await startTrackingUnsavedChanges();
    expect(unsavedChangesApi.unsavedChanges.value).toEqual({
      tagline: 'Testing is my speciality!',
    });
  });

  it('should detect unsaved changes when state changes during the lifetime of the component', async () => {
    const unsavedChangesApi = await startTrackingUnsavedChanges();
    expect(unsavedChangesApi.unsavedChanges.value).toBe(undefined);

    comparators.tagline[1]('Testing is my speciality!');
    await waitFor(() => {
      expect(unsavedChangesApi.unsavedChanges.value).toEqual({
        tagline: 'Testing is my speciality!',
      });
    });
  });

  it('current runtime state should become last saved state when parent save notification is triggered', async () => {
    const unsavedChangesApi = await startTrackingUnsavedChanges();
    expect(unsavedChangesApi.unsavedChanges.value).toBe(undefined);

    comparators.tagline[1]('Testing is my speciality!');
    await waitFor(() => {
      expect(unsavedChangesApi.unsavedChanges.value).toEqual({
        tagline: 'Testing is my speciality!',
      });
    });

    parentApi.saveNotification$.next();
    await waitFor(() => {
      expect(unsavedChangesApi.unsavedChanges.value).toBe(undefined);
    });
  });

  it('should reset unsaved changes, calling given setters with last saved values. This should remove all unsaved state', async () => {
    const unsavedChangesApi = await startTrackingUnsavedChanges();
    expect(unsavedChangesApi.unsavedChanges.value).toBe(undefined);

    comparators.tagline[1]('Testing is my speciality!');
    await waitFor(() => {
      expect(unsavedChangesApi.unsavedChanges.value).toEqual({
        tagline: 'Testing is my speciality!',
      });
    });

    unsavedChangesApi.resetUnsavedChanges();
    expect(comparators.tagline[1]).toHaveBeenCalledWith(`Oh he's a glutton for testing!`);
    await waitFor(() => {
      expect(unsavedChangesApi.unsavedChanges.value).toBe(undefined);
    });
  });

  it('uses a custom comparator when supplied', async () => {
    serializedStateForChild.age = 20;
    parentApi.getRuntimeStateForChild = () => ({
      age: 50,
    });
    const ageSubject = new BehaviorSubject(50);
    const customComparators: StateComparators<SuperTestStateType> = {
      ...initializeDefaultComparators(),
      age: [
        ageSubject,
        jest.fn((nextAge) => ageSubject.next(nextAge)),
        (lastAge, currentAge) => lastAge?.toString().length === currentAge?.toString().length,
      ],
    };

    const unsavedChangesApi = await startTrackingUnsavedChanges(customComparators);

    // here we expect there to be no unsaved changes, both unsaved state and last saved state have two digits.
    expect(unsavedChangesApi.unsavedChanges.value).toBe(undefined);

    comparators.age[1](101);

    await waitFor(() => {
      // here we expect there to be unsaved changes, because now the latest state has three digits.
      expect(unsavedChangesApi.unsavedChanges.value).toEqual({
        age: 101,
      });
    });
  });
});
