/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject } from '@kbn/core-saved-objects-server';
import { byIdAscComparator, getPreservedOrderComparator } from './utils';

const createObj = (id: string): SavedObject => ({
  id,
  type: 'dummy',
  attributes: {},
  references: [],
});

describe('byIdAscComparator', () => {
  it('sorts the objects by id asc', () => {
    const objs = [createObj('delta'), createObj('alpha'), createObj('beta')];

    objs.sort(byIdAscComparator);

    expect(objs.map((obj) => obj.id)).toEqual(['alpha', 'beta', 'delta']);
  });
});

describe('getPreservedOrderComparator', () => {
  it('sorts objects depending on the order of the provided list', () => {
    const objA = createObj('A');
    const objB = createObj('B');
    const objC = createObj('C');

    const comparator = getPreservedOrderComparator([objA, objB, objC]);

    const objs = [objC, objA, objB];
    objs.sort(comparator);

    expect(objs.map((obj) => obj.id)).toEqual(['A', 'B', 'C']);
  });

  it('appends unknown objects at the end of the list and sort them by id', () => {
    const objA = createObj('A');
    const objB = createObj('B');
    const objC = createObj('C');
    const addedA = createObj('addedA');
    const addedB = createObj('addedB');

    const comparator = getPreservedOrderComparator([objA, objB, objC]);

    const objs = [addedB, objC, addedA, objA, objB];
    objs.sort(comparator);

    expect(objs.map((obj) => obj.id)).toEqual(['A', 'B', 'C', 'addedA', 'addedB']);
  });
});
