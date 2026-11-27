/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getClonedPanelTitle } from './panel_titles';

describe('getClonedPanelTitle', () => {
  test('returns an empty title unchanged', () => {
    expect(getClonedPanelTitle(['Panel One'], '')).toBe('');
  });

  test('appends the clone tag to a title that has not been cloned', () => {
    expect(getClonedPanelTitle(['Panel One'], 'Panel One')).toBe('Panel One (copy)');
  });

  test('numbers the clone of a clone', () => {
    expect(getClonedPanelTitle(['Panel One', 'Panel One (copy)'], 'Panel One (copy)')).toBe(
      'Panel One (copy 1)'
    );
  });

  test('uses the next number after the highest existing clone', () => {
    const titles = ['Panel One', 'Panel One (copy)', 'Panel One (copy 1)', 'Panel One (copy 4)'];
    expect(getClonedPanelTitle(titles, 'Panel One (copy 1)')).toBe('Panel One (copy 5)');
  });

  test('cloning the original again after clones exist continues the numbering', () => {
    const titles = ['Panel One', 'Panel One (copy)'];
    expect(getClonedPanelTitle(titles, 'Panel One')).toBe('Panel One (copy 1)');
  });

  test('ignores clones of other panels', () => {
    const titles = ['Panel One', 'Other (copy 3)'];
    expect(getClonedPanelTitle(titles, 'Panel One')).toBe('Panel One (copy)');
  });
});
