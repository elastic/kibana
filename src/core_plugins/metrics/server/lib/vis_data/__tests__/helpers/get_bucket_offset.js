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
import { getBucketKey, getBucketOffset } from '../../helpers/get_bucket_offset';


describe('getBucketOffset(end, interval)', () => {

  describe('getBucketKey(value, interval, offset)', () => {
    it('should return 30 for bucket key for 32 with an offset of 5', () => {
      expect(getBucketKey(32, 5))
        .to.equal(30);
    });

    it('should return 30 for bucket key for 30 with an offset of 5', () => {
      expect(getBucketKey(30, 5))
        .to.equal(30);
    });

  });

  it('should return an offset of -3', () => {
    expect(getBucketOffset(32, 5))
      .to.equal(-3);
  });

  it('should return an offset of -5', () => {
    expect(getBucketOffset(30, 5))
      .to.equal(-5);
  });

});
