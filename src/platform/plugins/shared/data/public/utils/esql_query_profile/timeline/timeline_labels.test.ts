/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { groupLabel, planningPhaseLabel } from './timeline_labels';

describe('groupLabel', () => {
  it('makes a plain name readable', () => {
    expect(groupLabel('data')).toBe('Data');
    expect(groupLabel('node_reduce')).toBe('Node reduce');
    expect(groupLabel('final')).toBe('Final');
  });

  it('keeps a name that is not made of plain words as ES writes it', () => {
    expect(groupLabel('subplan-0.final')).toBe('subplan-0.final');
    expect(groupLabel('main.final')).toBe('main.final');
  });

  it('calls a group without a description Other', () => {
    expect(groupLabel('')).toBe('Other');
  });
});

describe('planningPhaseLabel', () => {
  it('calls a phase by its name in the profile', () => {
    expect(planningPhaseLabel('parsing')).toBe('Parsing');
    expect(planningPhaseLabel('view_resolution')).toBe('View resolution');
  });
});
