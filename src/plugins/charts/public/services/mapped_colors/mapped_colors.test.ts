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
  const mappedColors = new MappedColors();

  beforeEach(() => {
    mappedColors.purge();
  });

  it('should properly map keys to unique colors', () => {
    const arr = [1, 2, 3, 4, 5];
    mappedColors.mapKeys(arr);
    expect(_(mappedColors.mapping).values().uniq().size()).toBe(arr.length);
  });

  it('should have a flush method that moves the current map to the old map', function () {
    const arr = [1, 2, 3, 4, 5];
    mappedColors.mapKeys(arr);
    expect(_.keys(mappedColors.mapping).length).toBe(5);
    expect(_.keys(mappedColors.oldMap).length).toBe(0);

    mappedColors.flush();

    expect(_.keys(mappedColors.oldMap).length).toBe(5);
    expect(_.keys(mappedColors.mapping).length).toBe(0);

    mappedColors.flush();

    expect(_.keys(mappedColors.oldMap).length).toBe(0);
    expect(_.keys(mappedColors.mapping).length).toBe(0);
  });

  it('should use colors in the oldMap if they are available', function () {
    const arr = [1, 2, 3, 4, 5];
    mappedColors.mapKeys(arr);
    expect(_.keys(mappedColors.mapping).length).toBe(5);
    expect(_.keys(mappedColors.oldMap).length).toBe(0);

    mappedColors.flush();

    mappedColors.mapKeys([3, 4, 5]);
    expect(_.keys(mappedColors.oldMap).length).toBe(5);
    expect(_.keys(mappedColors.mapping).length).toBe(3);

    expect(mappedColors.mapping[1]).toBe(undefined);
    expect(mappedColors.mapping[2]).toBe(undefined);
    expect(mappedColors.mapping[3]).toEqual(mappedColors.oldMap[3]);
    expect(mappedColors.mapping[4]).toEqual(mappedColors.oldMap[4]);
    expect(mappedColors.mapping[5]).toEqual(mappedColors.oldMap[5]);
  });

  it('should have a purge method that clears both maps', function () {
    const arr = [1, 2, 3, 4, 5];
    mappedColors.mapKeys(arr);
    mappedColors.flush();
    mappedColors.mapKeys(arr);

    expect(_.keys(mappedColors.mapping).length).toBe(5);
    expect(_.keys(mappedColors.oldMap).length).toBe(5);

    mappedColors.purge();

    expect(_.keys(mappedColors.mapping).length).toBe(0);
    expect(_.keys(mappedColors.oldMap).length).toBe(0);
  });
});
