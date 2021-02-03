/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PriorityCollection } from './priority_collection';

test(`1, 2, 3`, () => {
  const priorityCollection = new PriorityCollection();
  priorityCollection.add(1, 1);
  priorityCollection.add(2, 2);
  priorityCollection.add(3, 3);
  expect(priorityCollection.toPrioritizedArray()).toEqual([1, 2, 3]);
});

test(`3, 2, 1`, () => {
  const priorityCollection = new PriorityCollection();
  priorityCollection.add(3, 3);
  priorityCollection.add(2, 2);
  priorityCollection.add(1, 1);
  expect(priorityCollection.toPrioritizedArray()).toEqual([1, 2, 3]);
});

test(`2, 3, 1`, () => {
  const priorityCollection = new PriorityCollection();
  priorityCollection.add(2, 2);
  priorityCollection.add(3, 3);
  priorityCollection.add(1, 1);
  expect(priorityCollection.toPrioritizedArray()).toEqual([1, 2, 3]);
});

test(`Number.MAX_VALUE, NUMBER.MIN_VALUE, 1`, () => {
  const priorityCollection = new PriorityCollection();
  priorityCollection.add(Number.MAX_VALUE, 3);
  priorityCollection.add(Number.MIN_VALUE, 1);
  priorityCollection.add(1, 2);
  expect(priorityCollection.toPrioritizedArray()).toEqual([1, 2, 3]);
});

test(`1, 1 throws Error`, () => {
  const priorityCollection = new PriorityCollection();
  priorityCollection.add(1, 1);
  expect(() => priorityCollection.add(1, 1)).toThrowErrorMatchingSnapshot();
});

test(`#has when empty returns false`, () => {
  const priorityCollection = new PriorityCollection();
  expect(priorityCollection.has(() => true)).toEqual(false);
});

test(`#has returns result of predicate`, () => {
  const priorityCollection = new PriorityCollection();
  priorityCollection.add(1, 'foo');
  expect(priorityCollection.has((val) => val === 'foo')).toEqual(true);
  expect(priorityCollection.has((val) => val === 'bar')).toEqual(false);
});
