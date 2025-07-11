/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLMessage, ESQLSource } from '../../../types';
import { ICommandContext } from '../../../commands_registry/types';
import { sourceExists } from '../sources';
import { getMessageFromId } from '../errors';

function hasWildcard(name: string) {
  return /\*/.test(name);
}

export function validateSources(sources: ESQLSource[], context?: ICommandContext) {
  const messages: ESQLMessage[] = [];
  const sourcesMap = new Set<string>(context?.sources?.map((source) => source.name) || []);

  const knownIndexNames = [];
  const knownIndexPatterns = [];
  const unknownIndexNames = [];
  const unknownIndexPatterns = [];

  for (const source of sources) {
    if (source.incomplete) {
      return messages;
    }

    if (source.sourceType === 'index') {
      const index = source.index;
      const sourceName = source.prefix ? source.name : index?.valueUnquoted;
      if (!sourceName) continue;

      if (sourceExists(sourceName, sourcesMap) && !hasWildcard(sourceName)) {
        knownIndexNames.push(source);
      }
      if (sourceExists(sourceName, sourcesMap) && hasWildcard(sourceName)) {
        knownIndexPatterns.push(source);
      }
      if (!sourceExists(sourceName, sourcesMap) && !hasWildcard(sourceName)) {
        unknownIndexNames.push(source);
      }
      if (!sourceExists(sourceName, sourcesMap) && hasWildcard(sourceName)) {
        unknownIndexPatterns.push(source);
      }
    }
  }

  unknownIndexNames.forEach((source) => {
    messages.push(
      getMessageFromId({
        messageId: 'unknownIndex',
        values: { name: source.name },
        locations: source.location,
      })
    );
  });

  if (knownIndexNames.length + unknownIndexNames.length + knownIndexPatterns.length === 0) {
    // only if there are no known index names, no known index patterns, and no unknown
    // index names do we worry about creating errors for unknown index patterns
    unknownIndexPatterns.forEach((source) => {
      messages.push(
        getMessageFromId({
          messageId: 'unknownIndex',
          values: { name: source.name },
          locations: source.location,
        })
      );
    });
  }

  return messages;
}
