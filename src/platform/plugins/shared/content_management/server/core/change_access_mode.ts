/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChangeAccessModeResult } from '../../common';
import type { ContentRegistry } from './registry';
import type { StorageContext } from './types';

export class ChangeAccessModeService {
  constructor(
    private readonly deps: {
      contentRegistry: ContentRegistry;
    }
  ) {}

  async changeAccessMode(
    objects: Array<{ type: string; id: string; ctx: StorageContext }>,
    options?: { accessMode?: 'read_only' | 'default' }
  ): Promise<ChangeAccessModeResult> {
    const objectsByType = objects.reduce((acc, obj) => {
      if (!acc[obj.type]) {
        acc[obj.type] = [];
      }
      acc[obj.type].push(obj);
      return acc;
    }, {} as Record<string, Array<{ type: string; id: string; ctx: StorageContext }>>);

    const results = [];

    for (const [contentTypeId, typeObjects] of Object.entries(objectsByType)) {
      try {
        const contentTypeDefinition = this.deps.contentRegistry.getDefinition(contentTypeId);

        if (!contentTypeDefinition.storage.changeAccessMode) {
          // If the storage doesn't support changeAccessMode, return error for all objects of this type
          for (const obj of typeObjects) {
            results.push({
              type: obj.type,
              id: obj.id,
              error: {
                error: 'Not Supported',
                message: `changeAccessMode is not supported for content type [${contentTypeId}]`,
                statusCode: 400,
              },
            });
          }
        } else {
          const ctx = typeObjects[0].ctx;
          const objectsForStorage = typeObjects.map((obj) => ({ type: obj.type, id: obj.id }));

          const result = await contentTypeDefinition.storage.changeAccessMode(
            ctx,
            objectsForStorage,
            options
          );
          results.push(...result.objects);
        }
      } catch (error) {
        for (const obj of typeObjects) {
          results.push({
            type: obj.type,
            id: obj.id,
            error: {
              error: 'Internal Server Error',
              message: error instanceof Error ? error.message : 'Unknown error occurred',
              statusCode: 500,
            },
          });
        }
      }
    }

    return { objects: results };
  }
}
