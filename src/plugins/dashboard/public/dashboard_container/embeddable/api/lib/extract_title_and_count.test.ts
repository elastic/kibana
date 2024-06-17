/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { extractTitleAndCount } from './extract_title_and_count';

describe('extractTitleAndCount', () => {
  it('extracts base title and copy count from a cloned dashboard title', () => {
    expect(extractTitleAndCount('Test dashboard (1)')).toEqual(['Test dashboard', 1]);
    expect(extractTitleAndCount('Test dashboard (2)')).toEqual(['Test dashboard', 2]);
    expect(extractTitleAndCount('Test dashboard (200)')).toEqual(['Test dashboard', 200]);
    expect(extractTitleAndCount('Test dashboard (1) (2) (3) (4) (5)')).toEqual([
      'Test dashboard (1) (2) (3) (4)',
      5,
    ]);
  });

  it('defaults to the count to 0 and returns the original title when the provided title does not contain a valid count', () => {
    expect(extractTitleAndCount('Test dashboard')).toEqual(['Test dashboard', 0]);
    expect(extractTitleAndCount('Test dashboard 2')).toEqual(['Test dashboard 2', 0]);
    expect(extractTitleAndCount('Test dashboard (-1)')).toEqual(['Test dashboard (-1)', 0]);
    expect(extractTitleAndCount('Test dashboard (0)')).toEqual(['Test dashboard (0)', 0]);
    expect(extractTitleAndCount('Test dashboard (3.0)')).toEqual(['Test dashboard (3.0)', 0]);
    expect(extractTitleAndCount('Test dashboard (8.4)')).toEqual(['Test dashboard (8.4)', 0]);
    expect(extractTitleAndCount('Test dashboard (foo3.0)')).toEqual(['Test dashboard (foo3.0)', 0]);
    expect(extractTitleAndCount('Test dashboard (bar7)')).toEqual(['Test dashboard (bar7)', 0]);
  });
});
