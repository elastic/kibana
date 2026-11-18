/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { containsMapDirective } from './contains_map_directive';

describe('containsMapDirective', () => {
  it.each([
    ['at the top', { $map: { items: '${{ x }}' }, name: '${{ item.name }}' }],
    ['deeper', { a: { b: { $map: { items: '${{ x }}' } } } }],
    ['next to other keys', { name: 'x', tags: { $map: { items: '${{ x }}', item: 'tag' } } }],
    ['in a list', [{ $map: { items: '${{ x }}' } }]],
    ['in a list in an object', { a: [{ b: 1 }, { $map: {} }] }],
    ['with an empty value', { $map: null }],
  ])('finds it %s', (_, value) => {
    expect(containsMapDirective(value)).toBe(true);
  });

  it.each([
    ['text', '$map'],
    ['text with the key in it', '{ "$map": 1 }'],
    ['a number', 1],
    ['a boolean', true],
    ['null', null],
    ['undefined', undefined],
    ['an empty object', {}],
    ['an empty list', []],
    ['a record without it', { a: { b: ['x', { c: 1 }] } }],
    ['a similar key', { map: 1, $maps: 2, $Map: 3, '$map ': 4, a$map: 5 }],
    ['the text as a value', { a: '$map' }],
  ])('does not find it in %s', (_, value) => {
    expect(containsMapDirective(value)).toBe(false);
  });
});
