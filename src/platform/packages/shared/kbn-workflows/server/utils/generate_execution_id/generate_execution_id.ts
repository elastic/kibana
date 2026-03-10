/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';

export function generateEncodedWorkflowExecutionId({
  indexName,
  indexPattern,
}: {
  indexName: string;
  indexPattern: string;
}): string {
  if (!indexPattern.endsWith('*')) {
    throw new Error('indexPattern must end with *');
  }
  const indexSuffix = indexName.replace(indexPattern.slice(0, -1), '');
  const uuid = uuidv4().replace(/-/g, '');
  const decodedId = `${indexSuffix}_${uuid}`;

  return Buffer.from(decodedId)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const UUID_HEX_LENGTH = 32;
const UUID_HEX_REGEX = /^[a-f0-9]{32}$/;

export function decodeEncodedWorkflowExecutionId(encodedWorkflowExecutionId: string):
  | {
      success: true;
      indexSuffix: string;
      uuid: string;
    }
  | { success: false; error: string } {
  const base64 = encodedWorkflowExecutionId.replace(/-/g, '+').replace(/_/g, '/');
  const decodedId = Buffer.from(base64, 'base64').toString();

  const lastUnderscoreIndex = decodedId.lastIndexOf('_');
  if (lastUnderscoreIndex === -1) {
    return { success: false, error: 'Invalid encoded execution ID: missing separator' };
  }

  const indexSuffix = decodedId.slice(0, lastUnderscoreIndex);
  const hex = decodedId.slice(lastUnderscoreIndex + 1);

  if (hex.length !== UUID_HEX_LENGTH || !UUID_HEX_REGEX.test(hex)) {
    return { success: false, error: 'Invalid encoded execution ID: malformed UUID' };
  }

  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20
  )}-${hex.slice(20)}`;
  return { success: true, indexSuffix, uuid };
}
