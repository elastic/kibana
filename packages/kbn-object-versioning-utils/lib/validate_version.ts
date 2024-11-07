/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// import type { Version } from '@kbn/object-versioning';
// Declaring it directly to avoid circular dependencies.
type Version = number;

export const validateVersion = (
  version: unknown
): { result: true; value: Version } | { result: false; value: null } => {
  if (typeof version === 'string') {
    const isValid = /^\d+$/.test(version);
    if (isValid) {
      const parsed = parseInt(version, 10);
      if (Number.isNaN(parsed)) {
        return { result: false, value: null };
      }
      return { result: true, value: parsed };
    }
    return { result: false, value: null };
  } else {
    const isValid = Number.isInteger(version);
    if (isValid) {
      return {
        result: true,
        value: version as Version,
      };
    }
    return {
      result: false,
      value: null,
    };
  }
};
