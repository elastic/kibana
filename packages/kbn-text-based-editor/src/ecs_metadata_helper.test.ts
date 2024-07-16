/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getColumnsWithMetadata } from './ecs_metadata_helper';
import type { DatatableColumnType } from '@kbn/expressions-plugin/common';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';

describe('getColumnsWithMetadata', () => {
  it('should return original columns if fieldsMetadata is not provided', async () => {
    const columns = [
      { name: 'ecs.version', type: 'string' as DatatableColumnType },
      { name: 'field1', type: 'string' as DatatableColumnType },
      { name: 'field2', type: 'number' as DatatableColumnType },
    ];

    const result = await getColumnsWithMetadata(columns);
    expect(result).toEqual(columns);
  });

  it('should return columns with metadata if ECS version field is present', async () => {
    const columns = [
      { name: 'ecs.version', type: 'string' as DatatableColumnType },
      { name: 'field2', type: 'number' as DatatableColumnType },
    ];
    const fieldsMetadata = {
      getClient: jest.fn().mockResolvedValue({
        find: jest.fn().mockResolvedValue({
          fields: {
            'ecs.version': { description: 'ECS version field', type: 'keyword' },
            'ecs.field': { description: 'ECS field description', type: 'keyword' },
          },
        }),
      }),
    } as unknown as FieldsMetadataPublicStart;

    const result = await getColumnsWithMetadata(columns, fieldsMetadata);

    expect(result).toEqual([
      {
        name: 'ecs.version',
        type: 'string',
        metadata: { description: 'ECS version field' },
      },
      { name: 'field2', type: 'number' },
    ]);
  });

  it('should handle keyword suffix correctly', async () => {
    const columns = [
      { name: 'ecs.version', type: 'string' as DatatableColumnType },
      { name: 'ecs.version.keyword', type: 'string' as DatatableColumnType },
      { name: 'field2', type: 'number' as DatatableColumnType },
    ];
    const fieldsMetadata = {
      getClient: jest.fn().mockResolvedValue({
        find: jest.fn().mockResolvedValue({
          fields: {
            'ecs.version': { description: 'ECS version field', type: 'keyword' },
          },
        }),
      }),
    } as unknown as FieldsMetadataPublicStart;

    const result = await getColumnsWithMetadata(columns, fieldsMetadata);

    expect(result).toEqual([
      { name: 'ecs.version', type: 'string', metadata: { description: 'ECS version field' } },
      {
        name: 'ecs.version.keyword',
        type: 'string',
        metadata: { description: 'ECS version field' },
      },
      { name: 'field2', type: 'number' },
    ]);
  });
});
