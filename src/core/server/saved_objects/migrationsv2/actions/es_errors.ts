/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface EsErrorCause {
  type: string;
  reason: string;
}

export const isWriteBlockException = ({ type, reason }: EsErrorCause): boolean => {
  return (
    type === 'cluster_block_exception' &&
    reason.match(/index \[.+] blocked by: \[FORBIDDEN\/8\/.+ \(api\)\]/) !== null
  );
};

export const isIncompatibleMappingException = ({ type }: EsErrorCause): boolean => {
  return type === 'strict_dynamic_mapping_exception' || type === 'mapper_parsing_exception';
};
