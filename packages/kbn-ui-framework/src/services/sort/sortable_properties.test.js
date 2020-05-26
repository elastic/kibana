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

import { SortableProperties } from './sortable_properties';

describe('SortProperties', () => {
  const name = {
    name: 'name',
    getValue: (bird) => bird.name,
    isAscending: true,
  };

  const size = {
    name: 'size',
    getValue: (bird) => bird.size,
    isAscending: false,
  };

  const color = {
    name: 'color',
    getValue: (bird) => bird.color,
    isAscending: true,
  };

  const birds = [
    {
      name: 'cardinal',
      color: 'red',
      size: 7,
    },
    {
      name: 'bluejay',
      color: 'blue',
      size: 8,
    },
    {
      name: 'chickadee',
      color: 'black and white',
      size: 3,
    },
  ];

  describe('initialSortProperty', () => {
    test('is set', () => {
      const sortableProperties = new SortableProperties([name, size, color], 'size');
      expect(sortableProperties.getSortedProperty().name).toBe('size');
    });

    test('throws an error with an invalid property name', () => {
      expect(() => new SortableProperties([name, size, color], 'does not exist')).toThrow();
    });

    test('throws an error property name is not defined', () => {
      expect(() => new SortableProperties([name, size, color])).toThrow();
    });
  });

  describe('isAscendingByName', () => {
    test('returns initial ascending values', () => {
      const initialColorAscending = color.isAscending;
      const initialNameAscending = name.isAscending;
      const initialSizeAscending = size.isAscending;

      const sortableProperties = new SortableProperties([name, size, color], 'color');

      expect(sortableProperties.isAscendingByName('color')).toBe(initialColorAscending);
      expect(sortableProperties.isAscendingByName('name')).toBe(initialNameAscending);
      expect(sortableProperties.isAscendingByName('size')).toBe(initialSizeAscending);
    });
  });

  describe('sortOn', () => {
    test('a new property name retains the original sort order', () => {
      const initialColorAscending = color.isAscending;
      const sortableProperties = new SortableProperties([name, size, color], 'color');
      sortableProperties.sortOn('name');
      expect(sortableProperties.isAscendingByName('color')).toBe(initialColorAscending);
    });

    test('the same property name twice flips sort order', () => {
      const initialColorAscending = color.isAscending;
      const sortableProperties = new SortableProperties([name, size, color], 'color');
      sortableProperties.sortOn('color');
      expect(sortableProperties.isAscendingByName('color')).toBe(!initialColorAscending);
    });
  });

  describe('sortItems', () => {
    test('sorts by initialSortProperty', () => {
      const sortableProperties = new SortableProperties([name, size, color], 'name');
      const sortedItems = sortableProperties.sortItems(birds);
      expect(sortedItems.length).toBe(birds.length);
      expect(sortedItems[0].name).toBe('bluejay');
      expect(sortedItems[1].name).toBe('cardinal');
      expect(sortedItems[2].name).toBe('chickadee');
    });

    test('first sorts by initial isAscending value', () => {
      const sortableProperties = new SortableProperties([name, size, color], 'size');
      const sortedItems = sortableProperties.sortItems(birds);
      expect(sortedItems[0].size).toBe(8);
      expect(sortedItems[1].size).toBe(7);
      expect(sortedItems[2].size).toBe(3);
    });

    test('sorts by descending', () => {
      const sortableProperties = new SortableProperties([name, size, color], 'name');
      sortableProperties.sortOn('size');
      sortableProperties.sortOn('size');
      const sortedItems = sortableProperties.sortItems(birds);
      expect(sortedItems[0].size).toBe(3);
      expect(sortedItems[1].size).toBe(7);
      expect(sortedItems[2].size).toBe(8);
    });

    test('empty items array is a noop', () => {
      const sortableProperties = new SortableProperties([name, size, color], 'color');
      const sortedItems = sortableProperties.sortItems([]);
      expect(sortedItems.length).toBe(0);
    });
  });
});
