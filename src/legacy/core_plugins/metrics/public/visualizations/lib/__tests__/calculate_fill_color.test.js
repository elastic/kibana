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

import { expect } from 'chai';
import { calculateFillColor } from '../calculate_fill_color';

describe('calculateFillColor(color, fill)', () => {
  it('should return "fill" and "fillColor" properties', () => {
    const color = 'rgb(255,0,0)';
    const fill = 1;
    const data = calculateFillColor(color, fill);

    expect(data.fill).to.be.true;
    expect(data.fillColor).to.be.a('string');
  });

  it('should set "fill" property to false in case of 0 opacity', () => {
    const color = 'rgb(255, 0, 0)';
    const fill = 0;
    const data = calculateFillColor(color, fill);

    expect(data.fill).to.be.false;
  });

  it('should return the opacity less than 1', () => {
    const color = 'rgba(255, 0, 0, 0.9)';
    const fill = 10;
    const data = calculateFillColor(color, fill);

    expect(data.fillColor).to.equal('rgba(255, 0, 0, 0.9)');
  });

  it('should sum fill and color opacity', () => {
    const color = 'rgba(255, 0, 0, 0.5)';
    const fill = 0.5;
    const data = calculateFillColor(color, fill);

    expect(data.fillColor).to.equal('rgba(255, 0, 0, 0.25)');
  });
});
