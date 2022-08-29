/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export const isWriteBlockException = (errorCause?: estypes.ErrorCause): boolean => {
  return (
    errorCause?.type === 'cluster_block_exception' &&
    errorCause?.reason.match(/index \[.+] blocked by: \[FORBIDDEN\/8\/.+ \(api\)\]/) !== null
  );
};

export const isIncompatibleMappingException = (errorCause?: estypes.ErrorCause): boolean => {
  return (
    errorCause?.type === 'strict_dynamic_mapping_exception' ||
    errorCause?.type === 'mapper_parsing_exception'
  );
};

export const isIndexNotFoundException = (errorCause?: estypes.ErrorCause): boolean => {
  return errorCause?.type === 'index_not_found_exception';
};

export const isClusterShardLimitExceeded = (errorCause?: estypes.ErrorCause): boolean => {
  return (
    errorCause?.type === 'validation_exception' &&
    errorCause?.reason.match(
      /this action would add .* shards, but this cluster currently has .* maximum normal shards open/
    ) !== null
  );
};
