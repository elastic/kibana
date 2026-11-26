/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventEmitter } from 'node:events';
import { NEVER, of } from 'rxjs';
import { hapiMocks } from '@kbn/hapi-mocks';
import { createRequestEventsFactory } from './request_events';

describe('createRequestEventsFactory', () => {
  it('exposes lazy streams as enumerable own properties without exposing backing state', () => {
    const request = hapiMocks.createRequest();
    const response = new EventEmitter();
    Object.assign(request.raw, { res: response });
    const events = createRequestEventsFactory(request).create();
    const copiedEvents = { ...events };
    const completed = jest.fn();

    expect(Object.keys(events)).toEqual(['aborted$', 'completed$']);
    expect(Object.values(events)).not.toContain(request);
    expect(copiedEvents.aborted$).toBe(events.aborted$);
    expect(copiedEvents.completed$).toBe(events.completed$);

    copiedEvents.completed$.subscribe(completed);
    response.emit('close');

    expect(completed).toHaveBeenCalledTimes(1);
  });

  it('shares the underlying streams without sharing mutable event containers', () => {
    const request = hapiMocks.createRequest();
    const response = new EventEmitter();
    Object.assign(request.raw, { res: response });
    const factory = createRequestEventsFactory(request);
    const first = factory.create();
    const second = factory.create();
    const firstCompleted = jest.fn();
    const secondCompleted = jest.fn();

    first.completed$.subscribe(firstCompleted);
    second.completed$.subscribe(secondCompleted);

    expect(first).not.toBe(second);
    expect(response.listenerCount('close')).toBe(1);

    first.completed$ = NEVER;
    expect(second.completed$).not.toBe(NEVER);

    response.emit('close');

    expect(firstCompleted).toHaveBeenCalledTimes(1);
    expect(secondCompleted).toHaveBeenCalledTimes(1);
  });

  it('returns an isolated event container for each fake request', () => {
    const factory = createRequestEventsFactory();
    const first = factory.create();
    const second = factory.create();

    expect(first).not.toBe(second);
    expect(first.aborted$).toBe(NEVER);
    expect(second.aborted$).toBe(NEVER);

    first.aborted$ = of(undefined);

    expect(first.aborted$).not.toBe(NEVER);
    expect(second.aborted$).toBe(NEVER);
  });
});
