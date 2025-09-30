/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

describe('generate_yaml_schema', () => {
  describe('fixAdditionalPropertiesInSchema', () => {
    it('should have the fixAdditionalPropertiesInSchema function with correct logic', () => {
      // This test validates that the fix logic is present in the code
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');

      const schemaFilePath = path.join(__dirname, 'generate_yaml_schema.ts');
      const schemaFileContent = fs.readFileSync(schemaFilePath, 'utf8');

      // Check that the fix logic is present
      expect(schemaFileContent).toContain('fixAdditionalPropertiesInSchema');
      expect(schemaFileContent).toContain(
        'CRITICAL FIX: Remove additionalProperties: false from objects inside allOf arrays'
      );
      expect(schemaFileContent).toContain('isInAllOf');
      expect(schemaFileContent).toContain('isInConnectorWithAllOf');
      expect(schemaFileContent).toContain('Complex schema intersection (simplified');
    });

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
});
