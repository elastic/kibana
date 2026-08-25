/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function convertTimestamp(timestamp?: string | number | null): string | number | null {
  if (timestamp) {
    if (typeof timestamp === 'string') {
      const trimmedTimestamp = timestamp.trim();
      if (trimmedTimestamp.length > 0) {
        const parsedTimestamp = parseInt(trimmedTimestamp, 10);

        if (!isNaN(parsedTimestamp) && JSON.stringify(parsedTimestamp) === trimmedTimestamp) {
          return parsedTimestamp; // return converted epoch
        }
        return trimmedTimestamp; // return string
      }
    }
    if (typeof timestamp === 'number') {
      return timestamp; // return epoch
    }
  }
  return null;
}
