/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
