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
import { createRequestEvents } from './request_events';

describe('createRequestEvents', () => {
  it('exposes lazy streams as enumerable own properties without exposing backing state', () => {
    const request = hapiMocks.createRequest();
    const response = new EventEmitter();
    Object.assign(request.raw, { res: response });
    const events = createRequestEvents(request);
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

  it('returns an isolated event container for each fake request', () => {
    const first = createRequestEvents();
    const second = createRequestEvents();

    expect(first).not.toBe(second);
    expect(first.aborted$).toBe(NEVER);
    expect(second.aborted$).toBe(NEVER);

    first.aborted$ = of(undefined);

    expect(first.aborted$).not.toBe(NEVER);
    expect(second.aborted$).toBe(NEVER);
  });
});
