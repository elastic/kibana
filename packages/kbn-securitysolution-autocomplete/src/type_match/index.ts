/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type } from '@kbn/securitysolution-io-ts-list-types';

/**
 * Given an input list type and a string based ES type this will match
 * if they're exact or if they are compatible with a range
 * @param type The type to match against the esType
 * @param esType The ES type to match with
 */
export const typeMatch = (type: Type, esType: string): boolean => {
  return (
    type === esType ||
    (type === 'ip_range' && esType === 'ip') ||
    (type === 'date_range' && esType === 'date') ||
    (type === 'double_range' && esType === 'double') ||
    (type === 'float_range' && esType === 'float') ||
    (type === 'integer_range' && esType === 'integer') ||
    (type === 'long_range' && esType === 'long')
  );
};
