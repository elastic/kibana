/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ActivityRegistry, toActivity, toHttpActivity } from './activity_registry';

const taskContext = { type: 'task manager', name: 'run alerting:.es-query', id: 'task-1' };

describe('toActivity', () => {
  it('maps task manager runs to allowlisted fields only', () => {
    expect(
      toActivity(
        { ...taskContext, description: 'run task', meta: { secret: 'x' }, url: '/x?q=1' },
        123
      )
    ).toEqual({ kind: 'task', type: 'alerting:.es-query', id: 'task-1', startedAt: 123 });
  });

  it.each(['alert', 'alerting_v2'])(
    'maps nested %s contexts to allowlisted fields only',
    (type) => {
      expect(
        toActivity({ type, name: 'execute .es-query', id: 'rule-1', description: 'rule name' }, 5)
      ).toEqual({ kind: type, type: 'execute .es-query', id: 'rule-1', startedAt: 5 });
    }
  );

  it('ignores other contexts', () => {
    expect(toActivity({ type: 'application', name: 'run x', id: '1' })).toBeUndefined();
    expect(toActivity({ type: 'task manager', name: 'mark task', id: '1' })).toBeUndefined();
    expect(toActivity({ type: 'task manager', name: 'run x' })).toBeUndefined();
    expect(toActivity({ type: 'alert', id: '1' })).toBeUndefined();
  });

  it('replaces control characters that could forge log lines', () => {
    const activity = toActivity({ ...taskContext, name: 'run a\nb', id: 'x\r\n\u001b[31my' });
    expect(activity).toEqual(expect.objectContaining({ type: 'a?b', id: 'x???[31my' }));
  });

  it('truncates long values', () => {
    const activity = toActivity({ ...taskContext, id: 'x'.repeat(1000) });
    expect(activity?.id).toHaveLength(256);
  });
});

describe('toHttpActivity', () => {
  it('uses the method, route pattern and request id', () => {
    expect(
      toHttpActivity({ id: 'req-1', route: { method: 'post', routePath: '/api/x/{id}' } }, 7)
    ).toEqual({ kind: 'http', type: 'POST /api/x/{id}', id: 'req-1', startedAt: 7 });
  });

  it('never falls back to the URL path when the route pattern is unknown', () => {
    expect(toHttpActivity({ id: 'r', route: { method: 'get' } }).type).toBe('GET unknown-route');
  });

  it('sanitises the request id', () => {
    const { id } = toHttpActivity({
      id: 'a\nb',
      route: { method: 'get', routePath: '/' },
    });
    expect(id).toBe('a?b');
  });
});

describe('ActivityRegistry', () => {
  it('tracks activities passed directly until ended', () => {
    const registry = new ActivityRegistry();
    const listener = { onStart: jest.fn(), onEnd: jest.fn() };
    registry.setListener(listener);

    const end = registry.track(
      toHttpActivity({ id: 'r', route: { method: 'get', routePath: '/' } })
    );
    expect(listener.onStart).toHaveBeenCalledWith(0, expect.objectContaining({ kind: 'http' }));
    end();
    expect(listener.onEnd).toHaveBeenCalledWith(0);
    expect(registry.size).toBe(0);
  });

  it('tracks activities before a listener is set and snapshots them', () => {
    const registry = new ActivityRegistry();
    const end = registry.observe(taskContext);
    expect(registry.size).toBe(1);

    const listener = { onStart: jest.fn(), onEnd: jest.fn() };
    const snapshot = registry.setListener(listener);
    expect(snapshot).toEqual([[0, expect.objectContaining({ id: 'task-1' })]]);

    end?.();
    expect(listener.onEnd).toHaveBeenCalledWith(0);
    expect(registry.size).toBe(0);
  });

  it('notifies the listener of starts and ends exactly once', () => {
    const registry = new ActivityRegistry();
    const listener = { onStart: jest.fn(), onEnd: jest.fn() };
    registry.setListener(listener);

    const end = registry.observe(taskContext);
    expect(listener.onStart).toHaveBeenCalledWith(0, expect.objectContaining({ id: 'task-1' }));
    end?.();
    end?.();
    expect(listener.onEnd).toHaveBeenCalledTimes(1);
  });

  it('returns undefined for untracked contexts', () => {
    expect(new ActivityRegistry().observe({ type: 'application' })).toBeUndefined();
  });
});
