/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isIncompatibleMappingException, isWriteBlockException } from './es_errors';

describe('isWriteBlockError', () => {
  it('returns true for a `index write` cluster_block_exception', () => {
    expect(
      isWriteBlockException({
        type: 'cluster_block_exception',
        reason: `index [.kibana_dolly] blocked by: [FORBIDDEN/8/index write (api)]`,
      })
    ).toEqual(true);
  });
  it('returns true for a `moving to block index write` cluster_block_exception', () => {
    expect(
      isWriteBlockException({
        type: 'cluster_block_exception',
        reason: `index [.kibana_dolly] blocked by: [FORBIDDEN/8/moving to block index write (api)]`,
      })
    ).toEqual(true);
  });
  it('returns false for incorrect type', () => {
    expect(
      isWriteBlockException({
        type: 'not_a_cluster_block_exception_at_all',
        reason: `index [.kibana_dolly] blocked by: [FORBIDDEN/8/index write (api)]`,
      })
    ).toEqual(false);
  });
});

describe('isIncompatibleMappingExceptionError', () => {
  it('returns true for `strict_dynamic_mapping_exception` errors', () => {
    expect(
      isIncompatibleMappingException({
        type: 'strict_dynamic_mapping_exception',
        reason: 'idk',
      })
    ).toEqual(true);
  });

  it('returns true for `mapper_parsing_exception` errors', () => {
    expect(
      isIncompatibleMappingException({
        type: 'mapper_parsing_exception',
        reason: 'idk',
      })
    ).toEqual(true);
  });
});
