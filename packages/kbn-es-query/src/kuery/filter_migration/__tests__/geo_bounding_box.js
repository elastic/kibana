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
import expect from '@kbn/expect';
import { convertGeoBoundingBox } from '../geo_bounding_box';

describe('filter to kuery migration', function() {
  describe('geo_bounding_box filter', function() {
    it('should return a kuery node equivalent to the given filter', function() {
      const filter = {
        meta: {
          type: 'geo_bounding_box',
          key: 'foo',
          params: {
            topLeft: {
              lat: 10,
              lon: 20,
            },
            bottomRight: {
              lat: 30,
              lon: 40,
            },
          },
        },
      };
      const result = convertGeoBoundingBox(filter);

      expect(result).to.have.property('type', 'function');
      expect(result).to.have.property('function', 'geoBoundingBox');

      const {
        arguments: [{ value: fieldName }, ...args],
      } = result;
      expect(fieldName).to.be('foo');

      const argByName = _.mapKeys(args, 'name');
      expect(argByName.topLeft.value.value).to.be('10, 20');
      expect(argByName.bottomRight.value.value).to.be('30, 40');
    });

    it('should throw an exception if the given filter is not of type "geo_bounding_box"', function() {
      const filter = {
        meta: {
          type: 'foo',
        },
      };

      expect(convertGeoBoundingBox)
        .withArgs(filter)
        .to.throwException(/Expected filter of type "geo_bounding_box", got "foo"/);
    });
  });
});
