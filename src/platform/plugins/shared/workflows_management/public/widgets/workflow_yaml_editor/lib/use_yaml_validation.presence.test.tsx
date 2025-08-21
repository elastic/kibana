/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getEsMethodPathPresenceMarkers } from './use_yaml_validation';

describe('getEsMethodPathPresenceMarkers', () => {
  const model = {
    getPositionAt: (offset: number) => ({ lineNumber: 1, column: 1 }),
  } as any;

  it("warns when 'with.method' is missing", () => {
    const wf = {
      steps: [{ name: 'es', type: 'elasticsearch.request', with: { path: '/_search' } }],
    } as any;
    const markers = getEsMethodPathPresenceMarkers(wf, 'name: es', model);
    expect(markers.some((m) => m.message.includes("missing 'with.method'"))).toBe(true);
  });

  it("warns when 'with.path' is missing", () => {
    const wf = {
      steps: [{ name: 'es', type: 'elasticsearch.request', with: { method: 'GET' } }],
    } as any;
    const markers = getEsMethodPathPresenceMarkers(wf, 'name: es', model);
    expect(markers.some((m) => m.message.includes("missing 'with.path'"))).toBe(true);
  });

  it('skips presence validation when method/path contain mustache', () => {
    const wf = {
      steps: [
        { name: 'es1', type: 'elasticsearch.request', with: { method: '{{ m }}', path: '/_x' } },
        { name: 'es2', type: 'elasticsearch.request', with: { method: 'GET', path: '{{ p }}' } },
      ],
    } as any;
    const markers = getEsMethodPathPresenceMarkers(wf, 'name: es1\nname: es2', model);
    expect(markers.length).toBe(0);
  });
});
