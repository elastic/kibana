/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WriteAdmission, profileSignature } from './admission';
import { FILES_PER_HOUR, HOUR_MS } from './constants';
import type { ProfileSummary } from './profile_summary';

/** 10:00 UTC: the start of a clock hour. */
const HOUR_START = Date.UTC(2026, 10, 20, 10);

/** Admits `FILES_PER_HOUR` distinct signatures at the start of the hour. */
const fillHour = (admission: WriteAdmission) => {
  for (let i = 0; i < FILES_PER_HOUR; i++) {
    expect(admission.admit(`src/frame_${i}.ts:1`, HOUR_START + i)).toBe('admitted');
  }
};

describe('WriteAdmission', () => {
  it('admits one capture per signature in a clock hour', () => {
    const admission = new WriteAdmission();
    expect(admission.admit('src/a.ts:1', HOUR_START)).toBe('admitted');
    expect(admission.admit('src/a.ts:1', HOUR_START + 1)).toBe('same_frame');
    expect(admission.admit('src/b.ts:1', HOUR_START + 2)).toBe('admitted');
  });

  it('refuses a new signature once the hour has admitted FILES_PER_HOUR', () => {
    const admission = new WriteAdmission();
    fillHour(admission);
    expect(admission.admit('src/new.ts:1', HOUR_START + HOUR_MS - 1)).toBe('hour_limit');
  });

  it('reports same_frame before hour_limit for a signature the full hour already admitted', () => {
    const admission = new WriteAdmission();
    fillHour(admission);
    expect(admission.admit('src/frame_0.ts:1', HOUR_START + 10)).toBe('same_frame');
  });

  it('clears the signatures when the clock hour changes', () => {
    const admission = new WriteAdmission();
    fillHour(admission);
    expect(admission.admit('src/frame_0.ts:1', HOUR_START + HOUR_MS)).toBe('admitted');
    expect(admission.admit('src/new.ts:1', HOUR_START + HOUR_MS + 1)).toBe('admitted');
  });

  it('uses clock hours, not an hour from the first admission', () => {
    const admission = new WriteAdmission();
    const lastMinute = HOUR_START + HOUR_MS - 60_000;
    expect(admission.admit('src/a.ts:1', lastMinute)).toBe('admitted');
    // One minute later is a new clock hour.
    expect(admission.admit('src/a.ts:1', HOUR_START + HOUR_MS)).toBe('admitted');
  });

  it('keeps refusals from using a slot', () => {
    const admission = new WriteAdmission();
    expect(admission.admit('src/a.ts:1', HOUR_START)).toBe('admitted');
    expect(admission.admit('src/a.ts:1', HOUR_START + 1)).toBe('same_frame');
    expect(admission.admit('src/a.ts:1', HOUR_START + 2)).toBe('same_frame');
    expect(admission.admit('src/b.ts:1', HOUR_START + 3)).toBe('admitted');
    expect(admission.admit('src/c.ts:1', HOUR_START + 4)).toBe('admitted');
  });
});

describe('profileSignature', () => {
  const summary = (overrides: Partial<ProfileSummary>): ProfileSummary => ({
    samples: 10,
    frames: [],
    kibanaFrames: [],
    ...overrides,
  });

  it('uses the top Kibana frame location', () => {
    expect(
      profileSignature(
        summary({
          frames: [{ name: 'parse', location: 'node_modules/zod/index.js:5', percent: 80 }],
          topKibanaFrame: { location: 'src/core/server/spin.ts:10', percent: 80 },
        })
      )
    ).toBe('src/core/server/spin.ts:10');
  });

  it('falls back to the top frame location without a Kibana frame', () => {
    expect(
      profileSignature(
        summary({
          frames: [{ name: 'parse', location: 'node_modules/zod/index.js:5', percent: 80 }],
        })
      )
    ).toBe('node_modules/zod/index.js:5');
  });

  it('falls back to the top frame name when it has no location', () => {
    expect(
      profileSignature(summary({ frames: [{ name: '(garbage collector)', percent: 90 }] }))
    ).toBe('(garbage collector)');
  });

  it('uses (unknown) without any frame', () => {
    expect(profileSignature(summary({}))).toBe('(unknown)');
  });
});
