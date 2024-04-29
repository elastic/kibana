/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  PresentationContainer,
  PublishesLastSavedState,
  SerializedPanelState,
} from '@kbn/presentation-containers';
import { getMockPresentationContainer } from '@kbn/presentation-containers/mocks';
import { StateComparators } from '@kbn/presentation-publishing';
import { waitFor } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import { startTrackingEmbeddableUnsavedChanges } from './react_embeddable_unsaved_changes';

interface SuperTestStateType {
  name: string;
  age: number;
  tagline: string;
}

describe('react embeddable unsaved changes', () => {
  let initialState: SuperTestStateType;
  let lastSavedState: SuperTestStateType;
  let comparators: StateComparators<SuperTestStateType>;
  let deserializeState: (state: SerializedPanelState) => SuperTestStateType;
  let parentApi: (PresentationContainer & PublishesLastSavedState) | null;

  beforeEach(() => {
    initialState = {
      name: 'Sir Testsalot',
      age: 42,
      tagline: 'A glutton for testing!',
    };
    lastSavedState = {
      name: 'Sir Testsalot',
      age: 42,
      tagline: 'A glutton for testing!',
    };
  });

  const initializeDefaultComparators = () => {
    const nameSubject = new BehaviorSubject<string>(initialState.name);
    const ageSubject = new BehaviorSubject<number>(initialState.age);
    const taglineSubject = new BehaviorSubject<string>(initialState.tagline);
    const defaultComparators: StateComparators<SuperTestStateType> = {
      name: [nameSubject, jest.fn((nextName) => nameSubject.next(nextName))],
      age: [ageSubject, jest.fn((nextAge) => ageSubject.next(nextAge))],
      tagline: [taglineSubject, jest.fn((nextTagline) => taglineSubject.next(nextTagline))],
    };
    return defaultComparators;
  };

  const startTrackingUnsavedChanges = (
    customComparators?: StateComparators<SuperTestStateType>
  ) => {
    comparators = customComparators ?? initializeDefaultComparators();
    deserializeState = jest.fn((state) => state.rawState as SuperTestStateType);

    parentApi = {
      ...getMockPresentationContainer(),
      getLastSavedStateForChild: () => ({ rawState: lastSavedState }),
      lastSavedState: new Subject<void>(),
    };
    return startTrackingEmbeddableUnsavedChanges('id', parentApi, comparators, deserializeState);
  };

  it('should return undefined unsaved changes when used without a parent context to provide the last saved state', async () => {
    parentApi = null;
    const unsavedChangesApi = startTrackingUnsavedChanges();
    expect(unsavedChangesApi).toBeDefined();
    expect(unsavedChangesApi.unsavedChanges.value).toBe(undefined);
  });

  it('runs factory deserialize function on last saved state', async () => {
    startTrackingUnsavedChanges();
    expect(deserializeState).toHaveBeenCalledWith({ rawState: lastSavedState });
  });

  it('should return unsaved changes subject initialized to undefined when no unsaved changes are detected', async () => {
    const unsavedChangesApi = startTrackingUnsavedChanges();
    expect(unsavedChangesApi.unsavedChanges.value).toBe(undefined);
  });

  it('should return unsaved changes subject initialized with diff when unsaved changes are detected', async () => {
    initialState.tagline = 'Testing is my speciality!';
    const unsavedChangesApi = startTrackingUnsavedChanges();
    expect(unsavedChangesApi.unsavedChanges.value).toEqual({
      tagline: 'Testing is my speciality!',
    });
  });

  it('should detect unsaved changes when state changes during the lifetime of the component', async () => {
    const unsavedChangesApi = startTrackingUnsavedChanges();
    expect(unsavedChangesApi.unsavedChanges.value).toBe(undefined);

    comparators.tagline[1]('Testing is my speciality!');
    await waitFor(() => {
      expect(unsavedChangesApi.unsavedChanges.value).toEqual({
        tagline: 'Testing is my speciality!',
      });
    });
  });

  it('should detect unsaved changes when last saved state changes during the lifetime of the component', async () => {
    const unsavedChangesApi = startTrackingUnsavedChanges();
    expect(unsavedChangesApi.unsavedChanges.value).toBe(undefined);

    lastSavedState.tagline = 'Some other tagline';
    parentApi?.lastSavedState.next();
    await waitFor(() => {
      expect(unsavedChangesApi.unsavedChanges.value).toEqual({
        // we expect `A glutton for testing!` here because that is the current state of the component.
        tagline: 'A glutton for testing!',
      });
    });
  });

  it('should reset unsaved changes, calling given setters with last saved values. This should remove all unsaved state', async () => {
    const unsavedChangesApi = startTrackingUnsavedChanges();
    expect(unsavedChangesApi.unsavedChanges.value).toBe(undefined);

    comparators.tagline[1]('Testing is my speciality!');
    await waitFor(() => {
      expect(unsavedChangesApi.unsavedChanges.value).toEqual({
        tagline: 'Testing is my speciality!',
      });
    });

    unsavedChangesApi.resetUnsavedChanges();
    expect(comparators.tagline[1]).toHaveBeenCalledWith('A glutton for testing!');
    await waitFor(() => {
      expect(unsavedChangesApi.unsavedChanges.value).toBe(undefined);
    });
  });

  it('uses a custom comparator when supplied', async () => {
    lastSavedState.age = 20;
    initialState.age = 50;
    const ageSubject = new BehaviorSubject(initialState.age);
    const customComparators: StateComparators<SuperTestStateType> = {
      ...initializeDefaultComparators(),
      age: [
        ageSubject,
        jest.fn((nextAge) => ageSubject.next(nextAge)),
        (lastAge, currentAge) => lastAge?.toString().length === currentAge?.toString().length,
      ],
    };

    const unsavedChangesApi = startTrackingUnsavedChanges(customComparators);

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
