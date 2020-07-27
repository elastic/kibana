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

import _ from 'lodash';
import d3 from 'd3';

import { coreMock } from '../../../../../core/public/mocks';
import { COLOR_MAPPING_SETTING } from '../../../common';
import { seedColors } from './seed_colors';
import { MappedColors } from './mapped_colors';

// Local state for config
const config = new Map<string, any>();

describe('Mapped Colors', () => {
  const mockUiSettings = coreMock.createSetup().uiSettings;
  mockUiSettings.get.mockImplementation((a) => config.get(a));
  mockUiSettings.set.mockImplementation((...a) => config.set(...a) as any);

  const mappedColors = new MappedColors(mockUiSettings);
  let previousConfig: any;

  beforeEach(() => {
    previousConfig = config.get(COLOR_MAPPING_SETTING);
    mappedColors.purge();
  });

  afterEach(() => {
    config.set(COLOR_MAPPING_SETTING, previousConfig);
  });

  it('should properly map keys to unique colors', () => {
    config.set(COLOR_MAPPING_SETTING, {});

    const arr = [1, 2, 3, 4, 5];
    mappedColors.mapKeys(arr);
    expect(_(mappedColors.mapping).values().uniq().size()).toBe(arr.length);
  });

  it('should not include colors used by the config', () => {
    const newConfig = { bar: seedColors[0] };
    config.set(COLOR_MAPPING_SETTING, newConfig);

    const arr = ['foo', 'baz', 'qux'];
    mappedColors.mapKeys(arr);

    const colorValues = _(mappedColors.mapping).values();
    expect(colorValues.includes(seedColors[0])).toBe(false);
    expect(colorValues.uniq().size()).toBe(arr.length);
  });

  it('should create a unique array of colors even when config is set', () => {
    const newConfig = { bar: seedColors[0] };
    config.set(COLOR_MAPPING_SETTING, newConfig);

    const arr = ['foo', 'bar', 'baz', 'qux'];
    mappedColors.mapKeys(arr);

    const expectedSize = _(arr).difference(_.keys(newConfig)).size();
    expect(_(mappedColors.mapping).values().uniq().size()).toBe(expectedSize);
    expect(mappedColors.get(arr[0])).not.toBe(seedColors[0]);
  });

  it('should treat different formats of colors as equal', () => {
    const color = d3.rgb(seedColors[0]);
    const rgb = `rgb(${color.r}, ${color.g}, ${color.b})`;
    const newConfig = { bar: rgb };
    config.set(COLOR_MAPPING_SETTING, newConfig);

    const arr = ['foo', 'bar', 'baz', 'qux'];
    mappedColors.mapKeys(arr);

    const expectedSize = _(arr).difference(_.keys(newConfig)).size();
    expect(_(mappedColors.mapping).values().uniq().size()).toBe(expectedSize);
    expect(mappedColors.get(arr[0])).not.toBe(seedColors[0]);
    expect(mappedColors.get('bar')).toBe(seedColors[0]);
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
