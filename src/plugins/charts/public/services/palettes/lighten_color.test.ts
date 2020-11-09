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

import color from 'color';
import { lightenColor } from './lighten_color';

describe('lighten_color', () => {
  it('should keep existing color if there is a single color step', () => {
    expect(lightenColor('#FF0000', 1, 1)).toEqual('#FF0000');
  });

  it('should keep existing color for the first step', () => {
    expect(lightenColor('#FF0000', 1, 10)).toEqual('#FF0000');
  });

  it('should lighten color', () => {
    const baseLightness = color('#FF0000', 'hsl').lightness();
    const result1 = lightenColor('#FF0000', 5, 10);
    const result2 = lightenColor('#FF0000', 10, 10);
    expect(baseLightness).toBeLessThan(color(result1, 'hsl').lightness());
    expect(color(result1, 'hsl').lightness()).toBeLessThan(color(result2, 'hsl').lightness());
  });

  it('should not exceed top lightness', () => {
    const result = lightenColor('#c0c0c0', 10, 10);
    expect(color(result, 'hsl').lightness()).toBeLessThan(95);
  });
});
