/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EmbeddableFactory } from './types';
import { buildEmbeddable } from './build_embeddable';
import { PhaseTracker } from './phase_tracker';

const phaseTracker = new PhaseTracker(performance.now());

const testEmbeddableFactory: EmbeddableFactory<{ name: string; bork: string }> = {
  type: 'test',
  buildEmbeddable: async ({ initialState, finalizeApi }) => {
    const api = finalizeApi({
      serializeState: () => ({
        name: initialState.name,
        bork: initialState.bork,
      }),
      applySerializedState: jest.fn(),
    });
    return {
      Component: () => (
        <div data-test-subj="superTestEmbeddable">
          SUPER TEST COMPONENT, name: {initialState.name} bork: {initialState.bork}
        </div>
      ),
      api,
    };
  },
};

const parentApi = {
  getSerializedStateForChild: () => ({ name: 'hello', bork: 'someValue' }),
};

it('should return Component and componentApi', async () => {
  const { Component, componentApi } = await buildEmbeddable({
    factory: testEmbeddableFactory,
    maybeId: '1234',
    parentApi,
    phaseTracker,
    type: 'test',
  });

  expect(Component).toMatchInlineSnapshot(`[Function]`);
  expect(componentApi).toMatchInlineSnapshot(`
    Object {
      "applySerializedState": [MockFunction],
      "hasLockedHoverActions$": BehaviorSubject {
        "_value": false,
        "closed": false,
        "currentObservers": null,
        "hasError": false,
        "isStopped": false,
        "observers": Array [],
        "thrownError": null,
      },
      "isCustomizable": true,
      "isDuplicable": true,
      "isExpandable": true,
      "isPinnable": false,
      "lockHoverActions": [Function],
      "parentApi": Object {
        "getSerializedStateForChild": [Function],
      },
      "phase$": BehaviorSubject {
        "_value": undefined,
        "closed": false,
        "currentObservers": null,
        "hasError": false,
        "isStopped": false,
        "observers": Array [],
        "thrownError": null,
      },
      "serializeState": [Function],
      "type": "test",
      "uuid": "1234",
    }
  `);
});

it('should handle factory error', async () => {
  const { Component, componentApi } = await buildEmbeddable({
    factory: {
      ...testEmbeddableFactory,
      buildEmbeddable: () => {
        throw new Error('error in buildEmbeddable');
      },
    },
    maybeId: '1234',
    parentApi,
    phaseTracker,
    type: 'test',
  });

  expect(Component).toMatchInlineSnapshot(`[Function]`);
  expect(componentApi).toMatchInlineSnapshot(`
    Object {
      "blockingError$": BehaviorSubject {
        "_value": [Error: error in buildEmbeddable],
        "closed": false,
        "currentObservers": null,
        "hasError": false,
        "isStopped": false,
        "observers": Array [],
        "thrownError": null,
      },
      "hasLockedHoverActions$": BehaviorSubject {
        "_value": false,
        "closed": false,
        "currentObservers": null,
        "hasError": false,
        "isStopped": false,
        "observers": Array [],
        "thrownError": null,
      },
      "isCustomizable": true,
      "isDuplicable": true,
      "isExpandable": true,
      "isPinnable": false,
      "lockHoverActions": [Function],
      "parentApi": Object {
        "getSerializedStateForChild": [Function],
      },
      "phase$": BehaviorSubject {
        "_value": undefined,
        "closed": false,
        "currentObservers": null,
        "hasError": false,
        "isStopped": false,
        "observers": Array [],
        "thrownError": null,
      },
      "type": "test",
      "uuid": "1234",
    }
  `);
});
