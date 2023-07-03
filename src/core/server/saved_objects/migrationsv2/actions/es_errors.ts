/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface EsErrorCause {
  type: string;
  reason?: string;
}

export const isWriteBlockException = (errorCause?: EsErrorCause): boolean => {
  return (
    errorCause?.type === 'cluster_block_exception' &&
    errorCause?.reason?.match(/index \[.+] blocked by: \[FORBIDDEN\/8\/.+ \(api\)\]/) !== null
  );
};

export const isIncompatibleMappingException = (errorCause?: EsErrorCause): boolean => {
  return (
    errorCause?.type === 'strict_dynamic_mapping_exception' ||
    errorCause?.type === 'mapper_parsing_exception' ||
    errorCause?.type === 'document_parsing_exception'
  );
};

export const isIndexNotFoundException = (errorCause?: EsErrorCause): boolean => {
  return errorCause?.type === 'index_not_found_exception';
};
