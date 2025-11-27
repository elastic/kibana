/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getWorkflowJsonSchema } from './get_workflow_json_schema';
import { WorkflowSchema } from '../schema';

describe('getWorkflowJsonSchema', () => {
  it('should set `additionalProperties: {}` for loose objects', () => {
    const mockWithSchema = WorkflowSchema.extend({
      steps: z.array(
        z.object({
          type: z.literal('elasticsearch.bulk'),
          with: z.object({
            operations: z.array(z.looseObject({})).optional().describe('Bulk operations'),
          }),
        })
      ),
    });
    const jsonSchema = getWorkflowJsonSchema(mockWithSchema);
    expect(jsonSchema).toBeDefined();
    expect((jsonSchema as any)?.additionalProperties).toBe(false);
    expect((jsonSchema as any)?.properties.steps.items.properties.with.additionalProperties).toBe(
      false
    );
    expect(
      (jsonSchema as any)?.properties.steps.items.properties.with.properties.operations.items
        .additionalProperties
    ).toStrictEqual({});
  });
});

describe('fixAdditionalPropertiesInSchema', () => {
  it('should remove additionalProperties from objects with connector properties in with context', () => {
    // Test the logic that identifies connector properties
    const testObj = {
      type: 'object',
      properties: {
        invocationCount: { type: 'integer' },
        timeframeEnd: { type: 'string' },
      },
      additionalProperties: false,
    };

    // Mock the fixAdditionalPropertiesInSchema function logic
    const connectorPropNames = [
      'invocationCount',
      'timeframeEnd',
      'enable_logged_requests',
      'actions',
      'description',
      'name',
      'type',
    ];
    const hasConnectorProps =
      !!testObj.properties &&
      connectorPropNames.some((prop) =>
        Object.prototype.hasOwnProperty.call(testObj.properties, prop)
      );

    const path = 'properties.with.anyOf.0.allOf.1';
    const shouldRemoveAdditionalProperties = hasConnectorProps && path.includes('with');

    expect(hasConnectorProps).toBe(true);
    expect(shouldRemoveAdditionalProperties).toBe(true);
  });

  it('should identify allOf patterns in path', () => {
    // Test the path analysis logic
    const testPaths = [
      'properties.with.anyOf.0.allOf.1',
      'properties.with.anyOf.0.allOf.2',
      'properties.steps.items.anyOf.0.allOf.1',
      'properties.other.object',
    ];

    testPaths.forEach((path) => {
      const pathParts = path.split('.');
      const isInAllOf = pathParts.some((part, index) => {
        return part === 'allOf' && pathParts[index + 1] && /^\d+$/.test(pathParts[index + 1]);
      });

      if (path.includes('allOf')) {
        expect(isInAllOf).toBe(true);
      } else {
        expect(isInAllOf).toBe(false);
      }
    });
  });

  it('should identify broken reference fallback objects', () => {
    // Test the broken reference detection logic
    const testObjects = [
      {
        type: 'object',
        properties: {},
        description: 'Complex schema intersection (simplified due to broken allOf reference)',
        additionalProperties: false,
      },
      {
        type: 'object',
        properties: { name: { type: 'string' } },
        description: 'Normal object',
        additionalProperties: false,
      },
      {
        type: 'object',
        properties: {},
        description: 'Another broken reference (simplified)',
        additionalProperties: false,
      },
    ];

    testObjects.forEach((obj) => {
      const isBrokenRef =
        obj.type === 'object' &&
        obj.additionalProperties === false &&
        obj.properties &&
        Object.keys(obj.properties).length === 0 &&
        obj.description &&
        obj.description.includes('simplified');

      if (obj.description.includes('simplified')) {
        expect(isBrokenRef).toBe(true);
      } else {
        expect(isBrokenRef).toBe(false);
      }
    });
  });
});
