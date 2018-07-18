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
import { BaseConfig } from '../../lib';
import { defaultParams } from '../../default_settings';
import { AXIS_SCALE_TYPE } from '../../components/chart/axis/axis_scale';

describe('BaseConfig', () => {

  let config;

  beforeEach(() => {
    config = new BaseConfig(defaultParams);
  });

  afterEach(() => {
    config = null;
  });

  it('should set and get the correct value', () => {
    config.set('foo', 'bar');
    expect(config.get('foo')).to.equal('bar');
  });

  it('should get multiple properties in array with correct type', () => {
    const [ type, addTooltip, categoryAxes, cellSize ] = config.get([
      'type',
      'addTooltip',
      'categoryAxes',
      'grid.cellSize'
    ]);

    expect(type).to.be.a('string');
    expect(addTooltip).to.be.a('boolean');
    expect(categoryAxes).to.eql([{
      id: 'CategoryAxis-1',
      type: 'category',
      position: 'top',
      scale: {
        type: AXIS_SCALE_TYPE.MONTHS
      },
    }, {
      id: 'CategoryAxis-2',
      type: 'category',
      position: 'left',
      scale: {
        type: AXIS_SCALE_TYPE.WEEKS
      },
    }]);
    expect(cellSize).to.be.a('number');
  });

});
