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

import { createBrushHandler } from './create_brush_handler';
import moment from 'moment';

describe('brushHandler', () => {
  let mockTimefilter;
  let onBrush;

  beforeEach(() => {
    mockTimefilter = {
      time: {},
      setTime: function(time) {
        this.time = time;
      },
    };
    onBrush = createBrushHandler(mockTimefilter);
  });

  it('returns brushHandler() that updates timefilter', () => {
    const from = '2017-01-01T00:00:00Z';
    const to = '2017-01-01T00:10:00Z';
    onBrush(from, to);
    expect(mockTimefilter.time.from).toEqual(moment(from).toISOString());
    expect(mockTimefilter.time.to).toEqual(moment(to).toISOString());
    expect(mockTimefilter.time.mode).toEqual('absolute');
  });
});
