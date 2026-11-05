/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getProfileFileName } from './file_name';

describe('getProfileFileName', () => {
  const date = new Date(2026, 0, 5, 9, 7, 42);

  it('names cpu profiles with the date and time without seconds', () => {
    expect(getProfileFileName('cpu', date)).toBe('kibana-cpu-profile-2026-01-05_09-07.cpuprofile');
  });

  it('names memory profiles with the date and time without seconds', () => {
    expect(getProfileFileName('memory', date)).toBe(
      'kibana-memory-profile-2026-01-05_09-07.heapprofile'
    );
  });
});
