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

import { collectBranch } from './_collect_branch';

describe('collectBranch()', () => {
  let item;
  let itemWithBuckets;
  const table = {
    columns: [
      { id: 'col1', name: 'Bucket1 Formatted Name' },
      { id: 'col2', name: 'Bucket2 Formatted Name' },
      { id: 'col3', name: 'Bucket3 Formatted Name' },
    ],
    rows: [{ col1: 'bucket1', col2: 'bucket2', col3: 'bucket3' }],
  };

  beforeEach(() => {
    item = {
      name: 'Count',
      depth: 1,
      size: 3,
    };
    itemWithBuckets = {
      name: 'bucket3',
      depth: 3,
      size: 6,
      rawData: {
        column: 2,
        row: 0,
        value: 'bucket3',
        table,
      },
      parent: {
        name: 'bucket2',
        depth: 2,
        size: 12,
        rawData: {
          column: 1,
          row: 0,
          value: 'bucket2',
          table,
        },
        parent: {
          name: 'bucket1',
          depth: 1,
          size: 24,
          rawData: {
            column: 0,
            row: 0,
            value: 'bucket1',
            table,
          },
          parent: {},
        },
      },
    };
  });

  it('should return an array with bucket objects', () => {
    const results = collectBranch(itemWithBuckets);
    expect(results).toHaveLength(3);

    expect(results[0]).toHaveProperty('metric', 24);
    expect(results[0]).toHaveProperty('depth', 0);
    expect(results[0]).toHaveProperty('bucket', 'bucket1');
    expect(results[0]).toHaveProperty('field', 'Bucket1 Formatted Name');

    expect(results[1]).toHaveProperty('metric', 12);
    expect(results[1]).toHaveProperty('depth', 1);
    expect(results[1]).toHaveProperty('bucket', 'bucket2');
    expect(results[1]).toHaveProperty('field', 'Bucket2 Formatted Name');

    expect(results[2]).toHaveProperty('metric', 6);
    expect(results[2]).toHaveProperty('depth', 2);
    expect(results[2]).toHaveProperty('bucket', 'bucket3');
    expect(results[2]).toHaveProperty('field', 'Bucket3 Formatted Name');
  });

  it('should fall back to item name when no rawData exists', () => {
    const results = collectBranch(item);
    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty('field', 'Count');
  });

  it('should fall back to printing the depth level when neither rawData nor name exists', () => {
    delete item.name;
    const results = collectBranch(item);
    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty('field', 'level 1');
  });
});
