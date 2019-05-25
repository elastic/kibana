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
import collectBranch from '../_collect_branch';
import expect from '@kbn/expect';
describe('collectBranch()', function () {
  let results;
  const convert = function (name) {
    return 'converted:' + name;
  };

  beforeEach(function () {
    results = collectBranch({
      name: 'bucket3',
      depth: 3,
      size: 6,
      field: { format: { convert: convert } },
      aggConfig: {
        getFieldDisplayName: _.constant('field3'),
        fieldFormatter: _.constant(String),
        makeLabel: () => {},
      },
      parent: {
        name: 'bucket2',
        depth: 2,
        size: 12,
        aggConfig: {
          fieldFormatter: _.constant(String),
          getFieldDisplayName: _.constant('field2'),
          makeLabel: () => {},
        },
        parent: {
          name: 'bucket1',
          depth: 1,
          size: 24,
          parent: {}
        }
      }
    });
  });

  it('should return an array with bucket objects', function () {
    expect(results).to.be.an(Array);
    expect(results).to.have.length(3);

    expect(results[0]).to.have.property('metric', 24);
    expect(results[0]).to.have.property('depth', 0);
    expect(results[0]).to.have.property('bucket', 'bucket1');
    expect(results[0]).to.have.property('field', 'level 1');
    expect(results[0]).to.have.property('aggConfig');

    expect(results[1]).to.have.property('metric', 12);
    expect(results[1]).to.have.property('depth', 1);
    expect(results[1]).to.have.property('bucket', 'bucket2');
    expect(results[1]).to.have.property('field', 'level 2');
    expect(results[1]).to.have.property('aggConfig');

    expect(results[2]).to.have.property('metric', 6);
    expect(results[2]).to.have.property('depth', 2);
    expect(results[2]).to.have.property('bucket', 'bucket3');
    expect(results[2]).to.have.property('field', 'level 3');
    expect(results[2]).to.have.property('aggConfig');

  });

});
