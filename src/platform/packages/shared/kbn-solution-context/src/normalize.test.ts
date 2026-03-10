/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normalizeSolutionView } from './normalize';

describe('normalizeSolutionView', () => {
  it('maps oblt to observability', () => {
    expect(normalizeSolutionView('oblt')).toBe('observability');
  });

  it('maps es to search', () => {
    expect(normalizeSolutionView('es')).toBe('search');
  });

  it('passes through security', () => {
    expect(normalizeSolutionView('security')).toBe('security');
  });

  it('passes through classic', () => {
    expect(normalizeSolutionView('classic')).toBe('classic');
  });

  it('returns classic for undefined', () => {
    expect(normalizeSolutionView(undefined)).toBe('classic');
  });
});
