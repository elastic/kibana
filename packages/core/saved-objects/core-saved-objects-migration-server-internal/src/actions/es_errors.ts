/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ErrorCause } from '@elastic/elasticsearch/lib/api/types';

export const isWriteBlockException = (errorCause?: ErrorCause): boolean => {
  return (
    errorCause?.type === 'cluster_block_exception' &&
    hasAllKeywordsInOrder(errorCause?.reason, ['index [', '] blocked by: [FORBIDDEN/8/', ' (api)]'])
  );
};

export const isIncompatibleMappingException = (errorCause?: ErrorCause): boolean => {
  return (
    errorCause?.type === 'strict_dynamic_mapping_exception' ||
    errorCause?.type === 'mapper_parsing_exception' ||
    errorCause?.type === 'document_parsing_exception'
  );
};

export const isIndexNotFoundException = (errorCause?: ErrorCause): boolean => {
  return errorCause?.type === 'index_not_found_exception';
};

export const isClusterShardLimitExceeded = (errorCause?: ErrorCause): boolean => {
  // traditional ES: validation_exception. serverless ES: illegal_argument_exception
  return (
    (errorCause?.type === 'validation_exception' ||
      errorCause?.type === 'illegal_argument_exception') &&
    hasAllKeywordsInOrder(errorCause?.reason, [
      'this action would add',
      'shards, but this cluster currently has',
      'maximum normal shards open',
    ])
  );
};

export const hasAllKeywordsInOrder = (message: string | undefined, keywords: string[]): boolean => {
  if (!message || !keywords.length) {
    return false;
  }

  const keywordIndices = keywords.map((keyword) => message?.indexOf(keyword) ?? -1);
  // check that all keywords are present and in the right order
  return keywordIndices.every((v, i, a) => v >= 0 && (!i || a[i - 1] <= v));
};
