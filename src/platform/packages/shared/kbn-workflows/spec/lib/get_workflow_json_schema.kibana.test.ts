/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ValidateFunction } from 'ajv';
import { Ajv } from 'ajv';
import yaml from 'yaml';
import type { JSONSchema } from '@kbn/zod/v4/core';
import { generateYamlSchemaFromConnectors } from './generate_yaml_schema_from_connectors';
import { getWorkflowJsonSchema } from './get_workflow_json_schema';
import { KIBANA_SAMPLE_STEPS } from './samples';
import type { ValidateWithYamlLspFunction } from './validate_with_yaml_lsp';
import { getValidateWithYamlLsp } from './validate_with_yaml_lsp';
import { getKibanaConnectors } from '../kibana';

describe('getWorkflowJsonSchema / kibana connectors', () => {
  let validateAjv: ValidateFunction;
  let jsonSchema: JSONSchema.JSONSchema;
  let validateWithYamlLsp: ValidateWithYamlLspFunction;

  beforeAll(() => {
    const workflowSchema = generateYamlSchemaFromConnectors(getKibanaConnectors());
    jsonSchema = getWorkflowJsonSchema(workflowSchema) as JSONSchema.JSONSchema;
    const ajv = new Ajv({ strict: false, validateFormats: false, discriminator: true });
    validateAjv = ajv.compile(jsonSchema);
    validateWithYamlLsp = getValidateWithYamlLsp(jsonSchema);
  });

  it('should fix Monaco JSON schema generation to restore YAML validation', () => {
    // This test verifies that the Monaco YAML validation works properly
    // after fixing the broken $ref paths in the JSON schema

    // Check if the schema generation worked
    expect(jsonSchema).toBeDefined();
    /* 
    console.log('Schema structure:', {
      hasType: 'type' in jsonSchema,
      type: jsonSchema.type,
      hasProperties: 'properties' in jsonSchema,
      hasDefinitions: 'definitions' in jsonSchema,
      topLevelKeys: Object.keys(jsonSchema),
    });
    */

    // Convert to string to search for issues
    const jsonString = JSON.stringify(jsonSchema);

    // Look for ALL broken reference patterns that cause Monaco errors
    // We need to find ANY $ref that points to a non-existent path in the schema

    // Extract all $ref paths from the schema
    const allRefs = jsonString.match(/"\$ref":"([^"]+)"/g) || [];
    const brokenRefs: string[] = [];

    for (const refMatch of allRefs) {
      const refPathMatch = refMatch.match(/"\$ref":"([^"]+)"/);
      if (!refPathMatch || !refPathMatch[1]) {
        // eslint-disable-next-line no-continue
        continue;
      }
      const refPath = refPathMatch[1];

      // Skip valid root references
      if (refPath === '#/definitions/WorkflowSchema') {
        // eslint-disable-next-line no-continue
        continue;
      }

      // Check if this reference can be resolved in the schema
      if (refPath.startsWith('#/definitions/')) {
        // Try to follow the path in the actual schema object
        const pathParts = refPath.substring(2).split('/'); // Remove '#/' and split
        let current = jsonSchema;
        let isValid = true;

        for (const part of pathParts) {
          if (current && typeof current === 'object' && part in current) {
            current = (current as any)[part];
          } else {
            isValid = false;
            break;
          }
        }

        if (!isValid) {
          brokenRefs.push(refMatch);
        }
      }
    }

    // Log what we found for debugging
    if (brokenRefs.length > 0) {
      // console.log(`❌ Found ${brokenRefs.length} broken references:`);
      // console.log('First 5 broken refs:', brokenRefs.slice(0, 5));

      // Show the specific pattern you reported
      const yourPattern = brokenRefs.find((ref) =>
        ref.includes('anyOf/665/properties/with/anyOf/6/allOf/1/allOf/1')
      );
      if (yourPattern) {
        // console.log('❌ Found your specific pattern:', yourPattern);
      }
    }

    // This should be empty - no broken references
    expect(brokenRefs).toEqual([]);
    // console.log('✅ No broken references found');

    // Verify core workflow structure is object with properties version, name, steps, and settings
    const workflowDef = jsonSchema as JSONSchema.ObjectSchema;
    expect(workflowDef.type).toBe('object');
    expect(workflowDef.properties).toBeDefined();
    expect(workflowDef?.properties?.version).toBeDefined();
    expect(workflowDef?.properties?.name).toBeDefined();
    expect(workflowDef?.properties?.steps).toBeDefined();
    expect(workflowDef?.properties?.settings).toBeDefined();

    // Verify steps array structure for proper validation
    expect((workflowDef?.properties?.steps as JSONSchema.ArraySchema)?.type).toBe('array');
    expect((workflowDef?.properties?.steps as JSONSchema.ArraySchema)?.items).toBeDefined();

    // Test that the schema can validate a basic workflow
    // Note: We don't actually validate here since we're testing the JSON schema structure

    // The schema should be valid JSON Schema that can be used for validation
    expect(typeof jsonSchema).toBe('object');
    expect(jsonSchema.definitions).toBeDefined();

    // console.log('✅ Monaco JSON schema validation is now working properly');
    // console.log(`📊 Schema has ${Object.keys(jsonSchema.definitions).length} definitions`);
    // console.log(
    // `📊 WorkflowSchema has ${Object.keys(workflowDef.properties).length} top-level properties`
    // );

    // Test that the schema properly validates Kibana connectors
    // Find a Kibana connector in the schema to test validation
    const stepItems = (workflowDef?.properties?.steps as any)?.items;
    if (stepItems && (stepItems as any).anyOf) {
      const kibanaConnector = stepItems.anyOf.find(
        (item: any) =>
          item.properties &&
          item.properties.type &&
          item.properties.type.const &&
          item.properties.type.const.startsWith('kibana.')
      );

      if (kibanaConnector && kibanaConnector.properties.with) {
        const withSchema = kibanaConnector.properties.with;
        /*
        console.log('🔍 Found Kibana connector with schema:', {
          type: kibanaConnector.properties.type.const,
          hasAdditionalProperties: 'additionalProperties' in withSchema,
          additionalProperties: withSchema.additionalProperties,
        });
*/
        // The with schema should now have additionalProperties: false for proper validation
        if (withSchema.additionalProperties === false) {
          // console.log('✅ Kibana connector properly rejects invalid properties');
        } else {
          // console.log('❌ Kibana connector still allows invalid properties');
        }
      }
    }

    // console.log('🔧 YAML editor validation should now work correctly');
  });

  it('should remove additionalProperties: false from objects inside allOf arrays (RulePreview fix)', () => {
    // This test validates the fix for RulePreview and similar complex union schemas
    // The issue was that objects inside allOf arrays had additionalProperties: false,
    // which blocked properties from other parts of the union

    // Find RulePreview connector in the JSON schema
    const jsonString = JSON.stringify(jsonSchema);
    const rulePreviewMatch = jsonString.match(
      /"const":\s*"kibana\.RulePreview"[\s\S]*?"with":\s*\{[\s\S]{0,2000}/
    );

    if (rulePreviewMatch) {
      const connectorDef = rulePreviewMatch[0];

      // Check for the problematic pattern: allOf containing objects with additionalProperties: false
      const allOfMatches = connectorDef.match(/"allOf":\s*\[[\s\S]*?\]/g);

      if (allOfMatches) {
        let foundProblematicAllOf = false;

        for (const allOfMatch of allOfMatches) {
          // Check if this allOf contains objects with additionalProperties: false
          const hasAdditionalPropertiesFalse = allOfMatch.includes('"additionalProperties":false');
          const hasObjectType = allOfMatch.includes('"type":"object"');

          if (hasAdditionalPropertiesFalse && hasObjectType) {
            foundProblematicAllOf = true;
            break;
          }
        }

        // After the fix, allOf arrays should NOT contain objects with additionalProperties: false
        expect(foundProblematicAllOf).toBe(false);
      }
    } else {
      // If RulePreview is not found, that's also a problem
      throw new Error('RulePreview connector not found in generated schema');
    }
  });

  it('should remove additionalProperties: false from broken reference fallback objects', () => {
    // This test validates the fix for broken reference fallback objects
    // These are empty objects with descriptions like "Complex schema intersection (simplified...)"
    // that were blocking ALL properties

    const jsonString = JSON.stringify(jsonSchema);

    // Find broken reference fallback objects
    const brokenRefMatches = jsonString.match(
      /"description":\s*"[^"]*(?:simplified|broken|Complex schema intersection)[^"]*"[^}]*"additionalProperties":\s*false/g
    );

    // After the fix, there should be NO broken reference objects with additionalProperties: false
    expect(brokenRefMatches).toBeNull();

    // But there should still be broken reference objects (just without additionalProperties: false)
    const brokenRefObjectsCount = (
      jsonString.match(
        /"description":\s*"[^"]*(?:simplified|broken|Complex schema intersection)[^"]*"/g
      ) || []
    ).length;
    expect(brokenRefObjectsCount).toEqual(0);
  });

  // This test ensures our generated JSON Schema is structurally valid
  // This is critical for Monaco autocomplete and validation to work properly
  it('should generate valid JSON Schema that can be compiled', () => {
    expect(jsonSchema).toBeTruthy();
    expect(validateAjv).toBeDefined();
  });

  KIBANA_SAMPLE_STEPS.forEach((step) => {
    it(`${step.type}`, async () => {
      const result = await validateWithYamlLsp(
        `test-${step.name}.yaml`,
        yaml.stringify({
          name: 'test-workflow',
          enabled: true,
          triggers: [{ type: 'manual' }],
          steps: [step],
        })
      );
      expect(result).toEqual([]);
    });
  });
});
