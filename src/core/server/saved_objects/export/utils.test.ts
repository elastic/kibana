/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { byIdAscComparator, getPreservedOrderComparator } from './utils';
import { SavedObject } from '../../../types';

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
