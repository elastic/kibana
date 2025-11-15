/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { getSampleDashboardState } from '../mocks';
import type { DashboardState } from '../../common';
import { initializeProjectRoutingManager } from './project_routing_manager';

describe('projectRouting', () => {
  test('Should update projectRouting via setProjectRouting', () => {
    const projectRoutingRestore$ = new BehaviorSubject<boolean>(true);
    const projectRoutingManager = initializeProjectRoutingManager(
      getSampleDashboardState(),
      projectRoutingRestore$
    );

    // initializes with undefined projectRouting by default
    expect(projectRoutingManager.api.projectRouting$.value).toBeUndefined();

    projectRoutingManager.api.setProjectRouting('_alias:_origin');
    expect(projectRoutingManager.api.projectRouting$.value).toBe('_alias:_origin');

    projectRoutingManager.api.setProjectRouting(undefined);
    expect(projectRoutingManager.api.projectRouting$.value).toBeUndefined();
  });

  test('Should detect projectRouting change from _alias:_origin to null when projectRoutingRestore is true', (done) => {
    const projectRoutingRestore$ = new BehaviorSubject<boolean>(true);
    const lastSavedState$ = new BehaviorSubject<DashboardState>({
      ...getSampleDashboardState(),
      projectRouting: '_alias:_origin',
    });
    const projectRoutingManager = initializeProjectRoutingManager(
      lastSavedState$.value,
      projectRoutingRestore$
    );

    // initializes with _alias:_origin projectRouting if set in last saved state
    expect(projectRoutingManager.api.projectRouting$.value).toBe('_alias:_origin');

    projectRoutingManager.internalApi.startComparing$(lastSavedState$).subscribe((changes) => {
      // When projectRoutingRestore is true, undefined is normalized to null by getState()
      expect(changes).toMatchInlineSnapshot(`
        Object {
          "projectRouting": null,
        }
      `);
      done();
    });

    projectRoutingManager.api.setProjectRouting(undefined);
  });

  test('Should detect change when projectRouting is undefined to normalize it to null', (done) => {
    const projectRoutingRestore$ = new BehaviorSubject<boolean>(true);
    const lastSavedState$ = new BehaviorSubject<DashboardState>(getSampleDashboardState());
    const projectRoutingManager = initializeProjectRoutingManager(
      lastSavedState$.value,
      projectRoutingRestore$
    );

    projectRoutingManager.internalApi.startComparing$(lastSavedState$).subscribe((changes) => {
      // When projectRoutingRestore is true and value is undefined, getState() normalizes to null
      // This should be detected as a change to save it properly
      expect(changes).toMatchInlineSnapshot(`
        Object {
          "projectRouting": null,
        }
      `);
      done();
    });

    // Setting to undefined when projectRoutingRestore is true should trigger normalization to null
    projectRoutingManager.api.setProjectRouting(undefined);
  });

  test('Should restore projectRouting in reset', () => {
    const projectRoutingRestore$ = new BehaviorSubject<boolean>(true);
    const lastSavedState$ = new BehaviorSubject<DashboardState>({
      ...getSampleDashboardState(),
      projectRouting: '_alias:_origin',
    });
    const projectRoutingManager = initializeProjectRoutingManager(
      lastSavedState$.value,
      projectRoutingRestore$
    );

    // Change projectRouting
    projectRoutingManager.api.setProjectRouting(undefined);
    expect(projectRoutingManager.api.projectRouting$.value).toBeUndefined();

    // Reset to last saved state
    projectRoutingManager.internalApi.reset(lastSavedState$.value);
    expect(projectRoutingManager.api.projectRouting$.value).toBe('_alias:_origin');
  });

  test('Should NOT detect projectRouting changes when projectRoutingRestore is false', (done) => {
    const projectRoutingRestore$ = new BehaviorSubject<boolean>(false);
    const lastSavedState$ = new BehaviorSubject<DashboardState>({
      ...getSampleDashboardState(),
      projectRouting: '_alias:_origin',
    });
    const projectRoutingManager = initializeProjectRoutingManager(
      lastSavedState$.value,
      projectRoutingRestore$
    );

    projectRoutingManager.internalApi.startComparing$(lastSavedState$).subscribe((changes) => {
      // Should not detect changes when projectRoutingRestore is false
      expect(changes).toMatchInlineSnapshot(`Object {}`);
      done();
    });

    // Change projectRouting - should not be detected as a change
    projectRoutingManager.api.setProjectRouting('_alias:_new');
  });

  test('Should not include projectRouting in getState when projectRoutingRestore is false', () => {
    const projectRoutingRestore$ = new BehaviorSubject<boolean>(false);
    const projectRoutingManager = initializeProjectRoutingManager(
      getSampleDashboardState(),
      projectRoutingRestore$
    );

    projectRoutingManager.api.setProjectRouting('_alias:_origin');
    const state = projectRoutingManager.internalApi.getState();

    // projectRouting should not be included when projectRoutingRestore is false
    expect(state.projectRouting).toBeUndefined();
  });

  test('Should include projectRouting in getState when projectRoutingRestore is true', () => {
    const projectRoutingRestore$ = new BehaviorSubject<boolean>(true);
    const projectRoutingManager = initializeProjectRoutingManager(
      getSampleDashboardState(),
      projectRoutingRestore$
    );

    projectRoutingManager.api.setProjectRouting('_alias:_origin');
    const state = projectRoutingManager.internalApi.getState();

    // projectRouting should be included when projectRoutingRestore is true
    expect(state.projectRouting).toBe('_alias:_origin');
  });

  test('Should save null when projectRoutingRestore is true and projectRouting is undefined', () => {
    const projectRoutingRestore$ = new BehaviorSubject<boolean>(true);
    const projectRoutingManager = initializeProjectRoutingManager(
      getSampleDashboardState(),
      projectRoutingRestore$
    );

    // Don't set any projectRouting (leave as undefined)
    const state = projectRoutingManager.internalApi.getState();

    // projectRouting should be saved as null when projectRoutingRestore is true
    expect(state.projectRouting).toBeNull();
  });

  test('Should distinguish between null (saved with no project) and undefined (not saved)', () => {
    const projectRoutingRestore$ = new BehaviorSubject<boolean>(true);
    const lastSavedState$ = new BehaviorSubject<DashboardState>({
      ...getSampleDashboardState(),
      projectRouting: null,
    });
    const projectRoutingManager = initializeProjectRoutingManager(
      lastSavedState$.value,
      projectRoutingRestore$
    );

    // Should initialize with null from saved state
    expect(projectRoutingManager.api.projectRouting$.value).toBeNull();

    const state = projectRoutingManager.internalApi.getState();
    // getState should return null when projectRouting is null
    expect(state.projectRouting).toBeNull();
  });

  test('Should not detect change from null to undefined when projectRoutingRestore is true', (done) => {
    const projectRoutingRestore$ = new BehaviorSubject<boolean>(true);
    const lastSavedState$ = new BehaviorSubject<DashboardState>({
      ...getSampleDashboardState(),
      projectRouting: null,
    });
    const projectRoutingManager = initializeProjectRoutingManager(
      lastSavedState$.value,
      projectRoutingRestore$
    );

    projectRoutingManager.internalApi.startComparing$(lastSavedState$).subscribe((changes) => {
      // When projectRoutingRestore is true, undefined is normalized to null, so no change detected
      expect(changes).toMatchInlineSnapshot(`Object {}`);
      done();
    });

    // Current state has undefined, saved state has null - getState() normalizes to null, so no change
    projectRoutingManager.api.setProjectRouting(undefined);
  });
});
