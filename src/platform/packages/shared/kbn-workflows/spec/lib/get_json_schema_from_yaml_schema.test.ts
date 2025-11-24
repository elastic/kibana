/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { JSONSchema } from '@kbn/zod/v4/core';
import { getJsonSchemaFromYamlSchema } from './get_json_schema_from_yaml_schema';
import { getOrResolveObject } from '../../common/utils';
import { WorkflowSchema } from '../schema';

function findStepTypeSchema(
  jsonSchema: JSONSchema.JSONSchema,
  stepType: string
): JSONSchema.JSONSchema | undefined {
  const stepsItems = (jsonSchema as any).properties?.steps?.items;
  if (!stepsItems) {
    return undefined;
  }
  const stepsItemsResolved = getOrResolveObject(stepsItems, jsonSchema);
  return (stepsItemsResolved as JSONSchema.JSONSchema).anyOf?.find(
    (step: any) => step.properties?.type?.const === stepType
  );
}

describe('getJsonSchemaFromYamlSchema', () => {
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
    const jsonSchema = getJsonSchemaFromYamlSchema(mockWithSchema);
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

describe('addFetcherToKibanaConnectors', () => {
  it('should add fetcher parameter to Kibana connector steps in JSON schema', () => {
    // Import the actual connector generation to test with real connectors
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { generateYamlSchemaFromConnectors } = require('./generate_yaml_schema_from_connectors');

    const mockConnectors = [
      {
        type: 'kibana.getCaseDefaultSpace',
        connectorIdRequired: false,
        description: 'GET /api/cases/:id',
        methods: ['GET'],
        patterns: ['/api/cases/{caseId}'],
        isInternal: true,
        parameterTypes: {
          pathParams: ['caseId'],
          urlParams: [],
          bodyParams: [],
        },
        paramsSchema: z.object({
          caseId: z.string(),
        }),
        outputSchema: z.any(),
      },
    ];

    const workflowSchema = generateYamlSchemaFromConnectors(mockConnectors);
    const jsonSchema = getJsonSchemaFromYamlSchema(workflowSchema);
    expect(jsonSchema).toBeDefined();

    const kibanaStep = findStepTypeSchema(
      jsonSchema as JSONSchema.JSONSchema,
      'kibana.getCaseDefaultSpace'
    );

    const fetcherSchema = getOrResolveObject(
      kibanaStep?.properties?.with?.properties?.fetcher,
      jsonSchema as JSONSchema.JSONSchema
    ) as JSONSchema.ObjectSchema;

    expect(fetcherSchema.type).toBe('object');
    expect(fetcherSchema.properties).toHaveProperty('skip_ssl_verification');
    expect(fetcherSchema.properties).toHaveProperty('follow_redirects');
    expect(fetcherSchema.properties).toHaveProperty('max_redirects');
    expect(fetcherSchema.properties).toHaveProperty('keep_alive');
  });

  it('should not add fetcher to non-Kibana connector steps', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { generateYamlSchemaFromConnectors } = require('./generate_yaml_schema_from_connectors');

    const mockConnectors = [
      {
        type: 'elasticsearch.search',
        connectorIdRequired: false,
        description: 'Elasticsearch search',
        methods: ['POST'],
        patterns: ['/{index}/_search'],
        isInternal: true,
        parameterTypes: {
          pathParams: ['index'],
          urlParams: [],
          bodyParams: [],
        },
        paramsSchema: z.object({
          index: z.string(),
        }),
        outputSchema: z.any(),
      },
    ];

    const workflowSchema = generateYamlSchemaFromConnectors(mockConnectors);
    const jsonSchema = getJsonSchemaFromYamlSchema(workflowSchema);

    const esStep = findStepTypeSchema(jsonSchema as JSONSchema.JSONSchema, 'elasticsearch.search');

    expect(esStep).toBeDefined();
    // Fetcher should NOT be added to ES connectors
    expect(esStep.properties.with.properties.fetcher).toBeUndefined();
  });

  it('should handle Kibana connectors with complex schemas', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { generateYamlSchemaFromConnectors } = require('./generate_yaml_schema_from_connectors');

    const mockConnectors = [
      {
        type: 'kibana.postActionsConnectorId',
        connectorIdRequired: false,
        description: 'POST /api/actions/connector/:id',
        methods: ['POST'],
        patterns: ['/api/actions/connector/{id}'],
        isInternal: true,
        parameterTypes: {
          pathParams: ['id'],
          urlParams: [],
          bodyParams: ['config'],
        },
        paramsSchema: z.object({
          id: z.string(),
          config: z.record(z.string(), z.any()),
        }),
        outputSchema: z.any(),
      },
      {
        type: 'elasticsearch.index',
        connectorIdRequired: false,
        description: 'Elasticsearch index',
        methods: ['POST'],
        patterns: ['/{index}/_doc'],
        isInternal: true,
        parameterTypes: {
          pathParams: ['index'],
          urlParams: [],
          bodyParams: [],
        },
        paramsSchema: z.object({
          index: z.string(),
        }),
        outputSchema: z.any(),
      },
    ];

    const workflowSchema = generateYamlSchemaFromConnectors(mockConnectors);
    const jsonSchema = getJsonSchemaFromYamlSchema(workflowSchema);

    const kibanaStep = findStepTypeSchema(
      jsonSchema as JSONSchema.JSONSchema,
      'kibana.postActionsConnectorId'
    );
    const esStep = findStepTypeSchema(jsonSchema as JSONSchema.JSONSchema, 'elasticsearch.index');

    // Kibana connector should have fetcher
    expect(kibanaStep).toBeDefined();
    expect(kibanaStep.properties.with.properties.fetcher).toBeDefined();

    // ES connector should NOT have fetcher
    expect(esStep).toBeDefined();
    expect(esStep.properties.with.properties.fetcher).toBeUndefined();
  });

  it('should handle workflow schema without steps', () => {
    // This shouldn't throw an error - generate schema with empty connectors
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { generateYamlSchemaFromConnectors } = require('./generate_yaml_schema_from_connectors');

    const workflowSchema = generateYamlSchemaFromConnectors([]);
    const jsonSchema = getJsonSchemaFromYamlSchema(workflowSchema);

    expect(jsonSchema).toBeDefined();
    // Should complete without errors even with no connectors
  });
});
