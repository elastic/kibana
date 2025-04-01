/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const REFERENCE_NAME_PREFIX = 'controlGroup_';

export function getReferenceName(controlId: string, referenceNameSuffix: string) {
  return `${REFERENCE_NAME_PREFIX}${controlId}:${referenceNameSuffix}`;
}

export function parseReferenceName(referenceName: string) {
  return {
    controlId: referenceName.substring(
      REFERENCE_NAME_PREFIX.length,
      referenceName.lastIndexOf(':')
    ),
  };
}
