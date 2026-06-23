/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  WORKFLOWS_EXECUTIONS_DATA_STREAM_BACKING_PREFIX,
} from '../../../common/execution_storage_constants';
import { extractBackingIndexSuffix, resolveBackingIndex } from './resolve_backing_index';

const BACKING_INDEX = '.ds-.workflows-executions-2026.06.22-000001';

describe('resolveBackingIndex', () => {
  it('reconstructs a backing index from prefix and suffix', () => {
    expect(
      resolveBackingIndex({
        backingIndexPrefix: WORKFLOWS_EXECUTIONS_DATA_STREAM_BACKING_PREFIX,
        indexSuffix: '2026.06.22-000001',
      })
    ).toBe(BACKING_INDEX);
  });
});

describe('extractBackingIndexSuffix', () => {
  it('strips the known prefix from a backing index name', () => {
    expect(
      extractBackingIndexSuffix({
        backingIndexName: BACKING_INDEX,
        backingIndexPrefix: WORKFLOWS_EXECUTIONS_DATA_STREAM_BACKING_PREFIX,
      })
    ).toBe('2026.06.22-000001');
  });

  it('throws when the backing index does not match the prefix', () => {
    expect(() =>
      extractBackingIndexSuffix({
        backingIndexName: '.workflows-executions-000001',
        backingIndexPrefix: WORKFLOWS_EXECUTIONS_DATA_STREAM_BACKING_PREFIX,
      })
    ).toThrow(/does not start with prefix/);
  });
});
