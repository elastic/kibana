/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLColumnData } from '../commands/registry/types';
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { type ECSMetadata, enrichFieldsWithECSInfo } from './enrich_fields_with_ecs';

describe('enrichFieldsWithECSInfo', () => {
  it('should return original columns if fieldsMetadata is not provided', async () => {
    const columns: ESQLFieldWithMetadata[] = [
      { name: 'ecs.version', type: 'keyword', userDefined: false },
      { name: 'field1', type: 'text', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
    ];

    const result = await enrichFieldsWithECSInfo(columns);
    expect(result).toEqual(columns);
  });

  it('should return columns with metadata if both name and type match with ECS fields', async () => {
    const columns: ESQLFieldWithMetadata[] = [
      { name: 'ecs.field', type: 'text', userDefined: false },
      { name: 'ecs.fakeBooleanField', type: 'boolean', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
    ];

    const fieldsMetadataCache: ECSMetadata = {
      'ecs.version': { description: 'ECS version field', type: 'keyword' },
      'ecs.field': { description: 'ECS field description', type: 'text' },
      'ecs.fakeBooleanField': {
        description: 'ECS fake boolean field description',
        type: 'keyword',
      },
    };

    const result = enrichFieldsWithECSInfo(columns, fieldsMetadataCache);

    expect(result).toEqual([
      {
        name: 'ecs.field',
        type: 'text',
        isEcs: true,
        userDefined: false,
      },
      { name: 'ecs.fakeBooleanField', type: 'boolean', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
    ]);
  });

  it('should handle keyword suffix correctly', async () => {
    const columns: ESQLFieldWithMetadata[] = [
      { name: 'ecs.version', type: 'keyword', userDefined: false },
      { name: 'ecs.version.keyword', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
    ];

    const fieldsMetadataCache: ECSMetadata = {
      'ecs.version': { description: 'ECS version field', type: 'keyword' },
    };

    const result = enrichFieldsWithECSInfo(columns, fieldsMetadataCache);

    expect(result).toEqual<ESQLColumnData[]>([
      { name: 'ecs.version', type: 'keyword', isEcs: true, userDefined: false },
      {
        name: 'ecs.version.keyword',
        type: 'keyword',
        isEcs: true,
        userDefined: false,
      },
      { name: 'field2', type: 'double', userDefined: false },
    ]);
  });
});
