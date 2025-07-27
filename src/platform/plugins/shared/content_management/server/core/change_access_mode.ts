/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectAccessControl } from '@kbn/core/server';
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
    options: { accessMode: SavedObjectAccessControl['accessMode'] }
  ): Promise<ChangeAccessModeResult> {
    const objectsByType = new Map<
      string,
      { ctx: StorageContext; objects: Array<{ type: string; id: string }> }
    >();

    for (const obj of objects) {
      if (!objectsByType.has(obj.type)) {
        objectsByType.set(obj.type, { ctx: obj.ctx, objects: [] });
      }
      objectsByType.get(obj.type)!.objects.push({ type: obj.type, id: obj.id });
    }

    const results = [];

    for (const [contentTypeId, { ctx, objects: typeObjects }] of objectsByType) {
      const contentTypeDefinition = this.deps.contentRegistry.getDefinition(contentTypeId);

      if (!contentTypeDefinition.storage.changeAccessMode) {
        throw new Error(`Saved object type ${contentTypeId} does not support changeAccessMode`);
      }

      const idsForStorage = typeObjects.map((obj) => obj.id);

      const result = await contentTypeDefinition.storage.changeAccessMode(
        ctx,
        idsForStorage,
        options
      );
      results.push(...result.objects);
    }

    return { objects: results };
  }
}
