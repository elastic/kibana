/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { propFilter } from './prop_filter';

describe('prop filter', () => {
  let nameFilter: Function;

  beforeEach(() => {
    nameFilter = propFilter('name');
  });

  const getObjects = (...names: string[]) => {
    const count = new Map();
    const objects = [];

    for (const name of names) {
      if (!count.has(name)) {
        count.set(name, 1);
      }
      objects.push({
        name,
        title: `${name} ${count.get(name)}`,
      });
      count.set(name, count.get(name) + 1);
    }

    return objects;
  };

  it('returns list when no filters are provided', () => {
    const objects = getObjects('table', 'table', 'pie');
    expect(nameFilter(objects)).toEqual(objects);
  });

  it('returns list when empty list of filters is provided', () => {
    const objects = getObjects('table', 'table', 'pie');
    expect(nameFilter(objects, [])).toEqual(objects);
  });

  it('should keep only the tables', () => {
    const objects = getObjects('table', 'table', 'pie');
    expect(nameFilter(objects, 'table')).toEqual(getObjects('table', 'table'));
  });

  it('should support comma-separated values', () => {
    const objects = getObjects('table', 'line', 'pie');
    expect(nameFilter(objects, 'table,line')).toEqual(getObjects('table', 'line'));
  });

  it('should support an array of values', () => {
    const objects = getObjects('table', 'line', 'pie');
    expect(nameFilter(objects, ['table', 'line'])).toEqual(getObjects('table', 'line'));
  });

  it('should return all objects', () => {
    const objects = getObjects('table', 'line', 'pie');
    expect(nameFilter(objects, '*')).toEqual(objects);
  });

  it('should allow negation', () => {
    const objects = getObjects('table', 'line', 'pie');
    expect(nameFilter(objects, ['!line'])).toEqual(getObjects('table', 'pie'));
  });

  it('should support a function for specifying what should be kept', () => {
    const objects = getObjects('table', 'line', 'pie');
    const line = (value: string) => value === 'line';
    expect(nameFilter(objects, line)).toEqual(getObjects('line'));
  });

  it('gracefully handles a filter function with zero arity', () => {
    const objects = getObjects('table', 'line', 'pie');
    const rejectEverything = () => false;
    expect(nameFilter(objects, rejectEverything)).toEqual([]);
  });
});
