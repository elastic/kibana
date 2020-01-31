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
import { filterToKueryAST } from '../filter_to_kuery';

describe('filter to kuery migration', function() {
  describe('filterToKueryAST', function() {
    it('should hand off conversion of known filter types to the appropriate converter', function() {
      const filter = {
        meta: {
          type: 'exists',
          key: 'foo',
        },
      };
      const result = filterToKueryAST(filter);

      expect(result).to.have.property('type', 'function');
      expect(result).to.have.property('function', 'exists');
    });

    it('should thrown an error when an unknown filter type is encountered', function() {
      const filter = {
        meta: {
          type: 'foo',
        },
      };

      expect(filterToKueryAST)
        .withArgs(filter)
        .to.throwException(/Couldn't convert that filter to a kuery/);
    });

    it('should wrap the AST node of negated filters in a "not" function', function() {
      const filter = {
        meta: {
          type: 'exists',
          key: 'foo',
        },
      };
      const negatedFilter = _.set(_.cloneDeep(filter), 'meta.negate', true);

      const result = filterToKueryAST(filter);
      const negatedResult = filterToKueryAST(negatedFilter);

      expect(negatedResult).to.have.property('type', 'function');
      expect(negatedResult).to.have.property('function', 'not');
      expect(negatedResult.arguments[0]).to.eql(result);
    });
  });
});
