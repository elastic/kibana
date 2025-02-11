/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLRealField } from '../../validation/types';

const removeKeywordSuffix = (name: string) => {
  return name.endsWith('.keyword') ? name.slice(0, -8) : name;
};

export interface ECSMetadata {
  [key: string]: {
    type?: string;
    source?: string;
    description?: string;
  };
}
/**
 * Returns columns with the metadata/description (e.g ECS info)
 * if available
 *
 * @param columns
 * @param fieldsMetadata
 * @returns
 */
export function enrichFieldsWithECSInfo(
  columns: Array<Omit<ESQLRealField, 'metadata'>>,
  ecsMetadataCache?: ECSMetadata
): ESQLRealField[] {
  if (!ecsMetadataCache) return columns;

  try {
    if (ecsMetadataCache) {
      return columns.map((c) => {
        // Metadata services gives description for
        // 'ecs.version' but not 'ecs.version.keyword'
        // but both should show description if available
        const metadata = ecsMetadataCache[removeKeywordSuffix(c.name)];

        // Need to convert metadata's type (e.g. keyword) to ES|QL type (e.g. string) to check if they are the same
        if (!metadata || (metadata?.type && metadata.type !== c.type)) return c;
        return {
          ...c,
          isEcs: true,
        };
      });
    }

    return columns;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to fetch field metadata', error);
  }
  return columns;
}
