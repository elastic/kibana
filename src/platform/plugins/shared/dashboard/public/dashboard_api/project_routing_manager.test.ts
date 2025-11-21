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

  test('Should detect projectRouting change from _alias:_origin to ALL when projectRoutingRestore is true', (done) => {
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
      // When projectRoutingRestore is true, changing to 'ALL' is detected
      expect(changes).toMatchInlineSnapshot(`
        Object {
          "projectRouting": "ALL",
        }
      `);
      done();
    });

    projectRoutingManager.api.setProjectRouting('ALL');
  });

  test('Should detect change when setting projectRouting to ALL from undefined', (done) => {
    const projectRoutingRestore$ = new BehaviorSubject<boolean>(true);
    const lastSavedState$ = new BehaviorSubject<DashboardState>(getSampleDashboardState());
    const projectRoutingManager = initializeProjectRoutingManager(
      lastSavedState$.value,
      projectRoutingRestore$
    );

    projectRoutingManager.internalApi.startComparing$(lastSavedState$).subscribe((changes) => {
      // When projectRoutingRestore is true, setting to 'ALL' should be detected as a change
      expect(changes).toMatchInlineSnapshot(`
        Object {
          "projectRouting": "ALL",
        }
      `);
      done();
    });

    // Setting to 'ALL' when projectRoutingRestore is true should be detected
    projectRoutingManager.api.setProjectRouting('ALL');
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

  test('Should save current routing when projectRoutingRestore is true', () => {
    const projectRoutingRestore$ = new BehaviorSubject<boolean>(true);
    const projectRoutingManager = initializeProjectRoutingManager(
      getSampleDashboardState(),
      projectRoutingRestore$
    );

    // Set projectRouting to 'ALL'
    projectRoutingManager.api.setProjectRouting('ALL');
    const state = projectRoutingManager.internalApi.getState();

    // projectRouting should be saved as 'ALL' when projectRoutingRestore is true
    expect(state.projectRouting).toBe('ALL');
  });

  test('Should distinguish between ALL (saved with all projects) and undefined (not saved)', () => {
    const projectRoutingRestore$ = new BehaviorSubject<boolean>(true);
    const lastSavedState$ = new BehaviorSubject<DashboardState>({
      ...getSampleDashboardState(),
      projectRouting: 'ALL',
    });
    const projectRoutingManager = initializeProjectRoutingManager(
      lastSavedState$.value,
      projectRoutingRestore$
    );

    // Should initialize with 'ALL' from saved state
    expect(projectRoutingManager.api.projectRouting$.value).toBe('ALL');

    const state = projectRoutingManager.internalApi.getState();
    // getState should return 'ALL' when projectRouting is 'ALL'
    expect(state.projectRouting).toBe('ALL');
  });

  test('Should not detect change when projectRouting remains the same', (done) => {
    const projectRoutingRestore$ = new BehaviorSubject<boolean>(true);
    const lastSavedState$ = new BehaviorSubject<DashboardState>({
      ...getSampleDashboardState(),
      projectRouting: 'ALL',
    });
    const projectRoutingManager = initializeProjectRoutingManager(
      lastSavedState$.value,
      projectRoutingRestore$
    );

    projectRoutingManager.internalApi.startComparing$(lastSavedState$).subscribe((changes) => {
      // When projectRouting is set to the same value as saved, no change detected
      expect(changes).toMatchInlineSnapshot(`Object {}`);
      done();
    });

    // Set to same value as saved state - should not detect a change
    projectRoutingManager.api.setProjectRouting('ALL');
  });
});
