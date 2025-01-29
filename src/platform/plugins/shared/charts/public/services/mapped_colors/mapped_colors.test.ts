/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import { MappedColors } from './mapped_colors';

describe('Mapped Colors', () => {
  it('should properly map keys to unique colors', () => {
    const mappedColors = new MappedColors();
    const arr = [1, 2, 3, 4, 5];
    mappedColors.mapKeys(arr);

    expect(_(mappedColors.mapping).values().uniq().size()).toBe(arr.length);
    expect(_.keys(mappedColors.mapping).length).toBe(5);
  });

  it('should allow to map keys multiple times and add new colors when doing so', function () {
    const mappedColors = new MappedColors();
    const arr = [1, 2, 3, 4, 5];
    mappedColors.mapKeys(arr);
    mappedColors.mapKeys([6, 7]);

    expect(_.keys(mappedColors.mapping).length).toBe(7);
    expect(mappedColors.mapping).toEqual({
      '1': '#00a69b',
      '2': '#57c17b',
      '3': '#6f87d8',
      '4': '#663db8',
      '5': '#bc52bc',
      '6': '#9e3533',
      '7': '#daa05d',
    });
  });
});
