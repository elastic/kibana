/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ResolveIndexResponse } from './types';

export function checkSourceExistence(sources: ResolveIndexResponse, inputString: string): boolean {
  const searchTerms = inputString.split(',').map((term) => term.trim());

  for (const searchTerm of searchTerms) {
    let found = false;

    // Check in indices
    if (sources.indices) {
      for (const index of sources.indices) {
        if (
          searchTerm === index.name ||
          (searchTerm.endsWith('*') && index.name.startsWith(searchTerm.slice(0, -1))) ||
          (searchTerm.endsWith('-*') && index.name.startsWith(searchTerm.slice(0, -1)))
        ) {
          found = true;
          break;
        }
      }
    }
    if (found) continue;

    // Check in aliases
    if (sources.aliases) {
      for (const alias of sources.aliases) {
        if (
          searchTerm === alias.name ||
          (searchTerm.endsWith('*') && alias.name.startsWith(searchTerm.slice(0, -1))) ||
          (searchTerm.endsWith('-*') && alias.name.startsWith(searchTerm.slice(0, -1)))
        ) {
          found = true;
          break;
        }
      }
    }
    if (found) continue;

    // Check in data_streams
    if (sources.data_streams) {
      for (const dataStream of sources.data_streams) {
        if (
          searchTerm === dataStream.name ||
          (searchTerm.endsWith('*') && dataStream.name.startsWith(searchTerm.slice(0, -1))) ||
          (searchTerm.endsWith('-*') && dataStream.name.startsWith(searchTerm.slice(0, -1)))
        ) {
          found = true;
          break;
        }
      }
    }

    if (!found) {
      return false; // If even one search term is not found, return false
    }
  }

  return true; // All search terms were found
}
