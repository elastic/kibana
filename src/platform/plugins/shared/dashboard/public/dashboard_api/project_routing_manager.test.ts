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
    const projectRoutingManager = initializeProjectRoutingManager(getSampleDashboardState());

    // initializes with undefined projectRouting by default
    expect(projectRoutingManager.api.projectRouting$.value).toBeUndefined();

    projectRoutingManager.api.setProjectRouting('_alias:_origin');
    expect(projectRoutingManager.api.projectRouting$.value).toBe('_alias:_origin');

    projectRoutingManager.api.setProjectRouting(undefined);
    expect(projectRoutingManager.api.projectRouting$.value).toBeUndefined();
  });

  test('Should detect projectRouting change from _alias:_origin to undefined', (done) => {
    const lastSavedState$ = new BehaviorSubject<DashboardState>({
      ...getSampleDashboardState(),
      projectRouting: '_alias:_origin',
    });
    const projectRoutingManager = initializeProjectRoutingManager(lastSavedState$.value);

    // initializes with _alias:_origin projectRouting if set in last saved state
    expect(projectRoutingManager.api.projectRouting$.value).toBe('_alias:_origin');

    projectRoutingManager.internalApi.startComparing$(lastSavedState$).subscribe((changes) => {
      expect(changes).toMatchInlineSnapshot(`
        Object {
          "projectRouting": undefined,
        }
      `);
      done();
    });

    projectRoutingManager.api.setProjectRouting(undefined);
  });

  test('Should not detect changes when projectRouting stays undefined', (done) => {
    const lastSavedState$ = new BehaviorSubject<DashboardState>(getSampleDashboardState());
    const projectRoutingManager = initializeProjectRoutingManager(lastSavedState$.value);

    projectRoutingManager.internalApi.startComparing$(lastSavedState$).subscribe((changes) => {
      expect(changes).toMatchInlineSnapshot(`Object {}`);
      done();
    });

    // Setting to undefined when it's already undefined should not trigger change
    projectRoutingManager.api.setProjectRouting(undefined);
  });

  test('Should restore projectRouting in reset', () => {
    const lastSavedState$ = new BehaviorSubject<DashboardState>({
      ...getSampleDashboardState(),
      projectRouting: '_alias:_origin',
    });
    const projectRoutingManager = initializeProjectRoutingManager(lastSavedState$.value);

    // Change projectRouting
    projectRoutingManager.api.setProjectRouting(undefined);
    expect(projectRoutingManager.api.projectRouting$.value).toBeUndefined();

    // Reset to last saved state
    projectRoutingManager.internalApi.reset(lastSavedState$.value);
    expect(projectRoutingManager.api.projectRouting$.value).toBe('_alias:_origin');
  });
});
