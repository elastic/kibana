/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  consumeTemplateForCreate,
  FROM_TEMPLATE_QUERY_PARAM,
  stashTemplateForCreate,
} from './template_handoff';

describe('template_handoff', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('exposes the query param name used on /create', () => {
    expect(FROM_TEMPLATE_QUERY_PARAM).toBe('fromTemplate');
  });

  it('round-trips YAML through stash → consume', () => {
    const yaml = 'name: my-workflow\nsteps: []\n';
    const token = stashTemplateForCreate(yaml);

    expect(token).toEqual(expect.any(String));
    expect(token).not.toContain('/'); // URL-safe: no path separators
    expect(consumeTemplateForCreate(token)).toBe(yaml);
  });

  it('produces a fresh token per stash so tokens do not collide', () => {
    const t1 = stashTemplateForCreate('yaml-1');
    const t2 = stashTemplateForCreate('yaml-2');

    expect(t1).not.toEqual(t2);
    expect(consumeTemplateForCreate(t1)).toBe('yaml-1');
    expect(consumeTemplateForCreate(t2)).toBe('yaml-2');
  });

  it('consumption is one-shot: a second consume of the same token returns undefined', () => {
    const token = stashTemplateForCreate('once');

    expect(consumeTemplateForCreate(token)).toBe('once');
    expect(consumeTemplateForCreate(token)).toBeUndefined();
  });

  it('returns undefined for a missing or invalid token', () => {
    expect(consumeTemplateForCreate(undefined)).toBeUndefined();
    expect(consumeTemplateForCreate('')).toBeUndefined();
    expect(consumeTemplateForCreate('nope-not-a-real-token')).toBeUndefined();
  });

  it('removes the sessionStorage entry after consumption so it does not leak', () => {
    const token = stashTemplateForCreate('abc');
    const before = window.sessionStorage.length;

    consumeTemplateForCreate(token);

    expect(window.sessionStorage.length).toBe(before - 1);
  });
});
