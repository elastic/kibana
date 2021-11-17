/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

import { SerializableRecord } from '@kbn/utility-types';
import fc from 'fast-check';

import { SearchSessionSavedObjectAttributes, SearchSessionStatus } from 'src/plugins/data/common';
import { SessionStateContainer, createSessionStateContainer } from './search_session_state';
import { SearchSessionSavedObject } from './sessions_client';

const option = <T>(arb: fc.Arbitrary<T>) => fc.option(arb, { nil: undefined });

function arbitrarySearchSessionSavedObjectAttributes(): fc.Arbitrary<SearchSessionSavedObjectAttributes> {
  return fc.record<SearchSessionSavedObjectAttributes>({
    idMapping: fc.object({
      values: [
        fc.record({
          id: fc.string({ minLength: 1 }),
          strategy: fc.string(),
          status: fc.string(),
          error: option(fc.string()),
        }),
      ],
    }) as fc.Arbitrary<SearchSessionSavedObjectAttributes['idMapping']>,
    created: fc.date().map((date) => date.toISOString()),
    expires: fc.date().map((date) => date.toISOString()),
    persisted: fc.boolean(),
    sessionId: fc.string({ minLength: 1 }),
    status: fc.constantFrom(
      SearchSessionStatus.CANCELLED,
      SearchSessionStatus.COMPLETE,
      SearchSessionStatus.ERROR,
      SearchSessionStatus.EXPIRED,
      SearchSessionStatus.IN_PROGRESS
    ),
    touched: fc.date().map((date) => date.toISOString()),
    version: fc.string(),
    appId: option(fc.string()),
    completed: option(fc.date().map((date) => date.toISOString())),
    name: option(fc.string()),
    initialState: option(fc.object() as fc.Arbitrary<SerializableRecord>),
    locatorId: option(fc.string()),
    realmName: option(fc.string()),
    realmType: option(fc.string()),
    restoreState: option(fc.object() as fc.Arbitrary<SerializableRecord>),
    username: option(fc.string()),
  });
}

function arbitrarySearchSessionSavedObject(): fc.Arbitrary<SearchSessionSavedObject> {
  return fc.record<SearchSessionSavedObject>({
    attributes: arbitrarySearchSessionSavedObjectAttributes(),
    id: fc.string({ minLength: 1 }),
    references: fc.array(fc.record({ id: fc.string(), name: fc.string(), type: fc.string() })),
    type: fc.constant('search-session'),
    coreMigrationVersion: option(fc.string()),
  });
}

class SearchSessionStateContainerModel {
  appName?: string;
  isRestore?: boolean;
  isStored?: boolean;
  sessionId?: string;
  isCanceled?: boolean;
  isStarted?: boolean;
  completedTime?: string;
  pendingSearches?: unknown[];
  searchSessionSavedObject?: SearchSessionSavedObject;
}

type SearchSessionStateCommand = fc.Command<
  SearchSessionStateContainerModel,
  SessionStateContainer
>;

class StartCommand implements SearchSessionStateCommand {
  constructor(private readonly appName: string) {}
  check(model: SearchSessionStateContainerModel): boolean {
    return true;
  }
  public run(model: SearchSessionStateContainerModel, real: SessionStateContainer): void {
    model.appName = this.appName;
    model.sessionId = undefined;
    model.isStored = false;
    model.isRestore = false;
    model.isCanceled = false;
    model.isStarted = false;
    model.pendingSearches = [];

    real.transitions.start({ appName: this.appName });
    const state = real.get();

    expect(state.sessionId).toBeTruthy();
    model.sessionId = state.sessionId;

    expect(model.appName).toBe(state.appName);
    expect(model.isCanceled).toBe(state.isCanceled);
    expect(model.isStored).toBe(state.isStored);
    expect(model.isRestore).toBe(state.isRestore);
    expect(model.isStarted).toBe(state.isStarted);
    expect(model.pendingSearches).toEqual(state.pendingSearches);
  }
  toString(): string {
    return `StartCommand(${this.appName})`;
  }
}

class RestoreCommand implements SearchSessionStateCommand {
  constructor(private readonly sessionId: string) {}
  check(model: SearchSessionStateContainerModel): boolean {
    return true;
  }
  public run(model: SearchSessionStateContainerModel, real: SessionStateContainer): void {
    model.sessionId = this.sessionId;
    model.isRestore = true;
    model.isStored = true;
    model.appName = undefined;
    model.isCanceled = false;
    model.isStarted = false;
    model.pendingSearches = [];

    real.transitions.restore(this.sessionId);

    const state = real.get();

    expect(model.sessionId).toBe(state.sessionId);
    expect(model.isRestore).toBe(state.isRestore);
    expect(model.isStored).toBe(state.isStored);
    expect(model.appName).toBe(state.appName);
    expect(model.isCanceled).toBe(state.isCanceled);
    expect(model.isStarted).toBe(state.isStarted);
    expect(model.pendingSearches).toEqual(state.pendingSearches);
  }
  toString(): string {
    return `RestoreCommand(${this.sessionId})`;
  }
}

class StoreCommand implements SearchSessionStateCommand {
  constructor(private readonly value: SearchSessionSavedObject) {}
  check(model: SearchSessionStateContainerModel): boolean {
    return Boolean(model.sessionId && !(model.isStored || model.isRestore));
  }
  public run(model: SearchSessionStateContainerModel, real: SessionStateContainer): void {
    model.isStored = true;
    model.searchSessionSavedObject = this.value;

    real.transitions.store(this.value);
    const state = real.get();

    expect(model.isStored).toBe(state.isStored);
    expect(model.searchSessionSavedObject).toEqual(state.searchSessionSavedObject);
  }
  toString(): string {
    return `StoreCommand(${JSON.stringify(this.value)})`;
  }
}

class TrackSearchCommand implements SearchSessionStateCommand {
  constructor(private readonly value: unknown) {}
  check(model: SearchSessionStateContainerModel): boolean {
    return Boolean(model.sessionId);
  }
  public run(model: SearchSessionStateContainerModel, real: SessionStateContainer): void {
    model.pendingSearches = (model.pendingSearches ?? []).concat(this.value);
    model.isStarted = true;
    model.completedTime = undefined;

    real.transitions.trackSearch(this.value);
    const state = real.get();

    expect(model.isStarted).toBe(state.isStarted);
    expect(model.pendingSearches).toEqual(state.pendingSearches);
  }
  toString(): string {
    return `TrackSearchCommand(${JSON.stringify(this.value)})`;
  }
}

class UntrackSearchCommand implements SearchSessionStateCommand {
  constructor(private readonly value: unknown) {}
  check(model: SearchSessionStateContainerModel): boolean {
    return model.pendingSearches?.some((v) => v === this.value) ?? false;
  }
  public run(model: SearchSessionStateContainerModel, real: SessionStateContainer): void {
    model.pendingSearches = (model.pendingSearches ?? []).filter((search) => search !== this.value);

    real.transitions.unTrackSearch(this.value);
    const state = real.get();

    expect(model.pendingSearches).toEqual(state.pendingSearches);
  }
  toString(): string {
    return `TrackSearchCommand(${JSON.stringify(this.value)})`;
  }
}

class CancelCommand implements SearchSessionStateCommand {
  constructor() {}
  check(model: SearchSessionStateContainerModel): boolean {
    return Boolean(model.sessionId && !model.isRestore);
  }
  public run(model: SearchSessionStateContainerModel, real: SessionStateContainer): void {
    model.pendingSearches = [];
    model.isCanceled = true;
    model.isStored = false;
    model.searchSessionSavedObject = undefined;

    real.transitions.cancel();
    const state = real.get();

    expect(model.pendingSearches).toEqual(state.pendingSearches);
    expect(model.isCanceled).toBe(state.isCanceled);
    expect(model.isStored).toBe(state.isStored);
    expect(model.searchSessionSavedObject).toBe(state.searchSessionSavedObject);
  }
  toString(): string {
    return `CancelCommand()`;
  }
}

const SearchStateContainerCommands = fc.commands(
  [
    fc.string().map((value) => new StartCommand(value)),
    fc.string().map((sessionId) => new RestoreCommand(sessionId)),
    arbitrarySearchSessionSavedObject().map((so) => new StoreCommand(so)),
    fc.constant(new CancelCommand()),
    // Generate random numbers between 1 and 10 so that we will test
    // untracking
    fc.nat({ max: 10 }).map((nr) => new TrackSearchCommand(nr)),
    fc.nat({ max: 10 }).map((nr) => new UntrackSearchCommand(nr)),
  ],
  {
    maxCommands: 1000,
  }
);

describe('Search session state', () => {
  it('should function as expected', () => {
    fc.assert(
      fc.property(SearchStateContainerCommands, (commands) => {
        const { stateContainer: real } = createSessionStateContainer();
        const model = new SearchSessionStateContainerModel();
        fc.modelRun(() => ({ real, model }), commands);
      })
    );
  });
});
