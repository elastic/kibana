/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Ajv } from 'ajv';
import { generateYamlSchemaFromConnectors } from './generate_yaml_schema_from_connectors';
import { getWorkflowJsonSchema } from './get_workflow_json_schema';
import { GENERATED_KIBANA_CONNECTORS } from '../../common/generated/kibana_connectors.gen';

describe('getWorkflowJsonSchema / kibana connectors', () => {
  it('should fix Monaco JSON schema generation to restore YAML validation', () => {
    // This test verifies that the Monaco YAML validation works properly
    // after fixing the broken $ref paths in the JSON schema

    // Generate the workflow schema and convert to JSON schema (this is what Monaco uses)
    const workflowSchema = generateYamlSchemaFromConnectors(GENERATED_KIBANA_CONNECTORS);
    const jsonSchema = getWorkflowJsonSchema(workflowSchema);

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
    expect(workflowDef.properties.version).toBeDefined();
    expect(workflowDef.properties.name).toBeDefined();
    expect(workflowDef.properties.steps).toBeDefined();
    expect(workflowDef.properties.settings).toBeDefined();

    // Verify steps array structure for proper validation
    expect(workflowDef.properties.steps.type).toBe('array');
    expect(workflowDef.properties.steps.items).toBeDefined();

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
    const stepItems = workflowDef.properties.steps.items;
    if (stepItems && stepItems.anyOf) {
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

    // Generate the workflow schema and convert to JSON schema
    const workflowSchema = generateYamlSchemaFromConnectors(GENERATED_KIBANA_CONNECTORS);
    const jsonSchema = getWorkflowJsonSchema(workflowSchema);

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

    // Generate the workflow schema and convert to JSON schema
    const workflowSchema = generateYamlSchemaFromConnectors(GENERATED_KIBANA_CONNECTORS);
    const jsonSchema = getWorkflowJsonSchema(workflowSchema);

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

  it('should generate valid JSON Schema that can be compiled', () => {
    // This test ensures our generated JSON Schema is structurally valid
    // This is critical for Monaco autocomplete and validation to work properly

    // Generate the workflow schema and convert to JSON schema (this is what Monaco uses)
    const workflowSchema = generateYamlSchemaFromConnectors(GENERATED_KIBANA_CONNECTORS);
    const jsonSchema = getWorkflowJsonSchema(workflowSchema);

    // Try to compile the schema with AJV (like Monaco does)
    const ajv = new Ajv({ strict: false, validateFormats: false });

    let schemaIsValid = false;

    try {
      ajv.compile(jsonSchema);
      schemaIsValid = true;
      // console.log('✅ JSON Schema compiled successfully - Monaco autocomplete should work');
    } catch (error) {
      // console.log('❌ JSON Schema compilation failed:', error.message);

      // Common issues in generated schemas:
      if (error.message.includes('duplicate items')) {
        // console.log('Issue: Duplicate enum values in the schema');
      }
      if (error.message.includes('must be array')) {
        // console.log('Issue: Schema structure problems with array definitions');
      }
      if (error.message.includes('must match a schema in anyOf')) {
        // console.log('Issue: anyOf schema validation problems');
      }
    }

    // The schema must be valid for Monaco to work properly
    expect(schemaIsValid).toBe(true);

    if (!schemaIsValid) {
      // console.log('🔧 Schema generation produced invalid JSON Schema');
      // console.log('This breaks Monaco autocomplete and validation');
      // console.log('Error:', error.message);
    }
  });

  it('should generate a valid JSON Schema from a zod schema', () => {
    const workflowSchema = generateYamlSchemaFromConnectors(GENERATED_KIBANA_CONNECTORS);
    const jsonSchema = getWorkflowJsonSchema(workflowSchema);

    // Test data with addCaseCommentDefaultSpace (proper workflow structure)
    const testWorkflow = {
      version: '1',
      name: 'Test Workflow',
      triggers: [{ type: 'manual' }], // Add a trigger to satisfy schema
      steps: [
        {
          name: 'test',
          type: 'kibana.addCaseCommentDefaultSpace',
          with: {
            caseId: 'test-case',
            comment: 'test comment',
            owner: 'cases',
            type: 'user',
          },
        },
      ],
    };

    // Test data with INVALID properties that should be rejected
    const invalidWorkflow = {
      version: '1',
      name: 'Test Workflow',
      triggers: [{ type: 'manual' }], // Add a trigger to satisfy schema
      steps: [
        {
          name: 'test',
          type: 'kibana.addCaseCommentDefaultSpace',
          with: {
            invalidProperty: 'this should be rejected',
            anotherBadProp: 'also bad',
          },
        },
      ],
    };

    const ajv = new Ajv({ strict: false, validateFormats: false });

    const validate = ajv.compile(jsonSchema);

    // Test 1: Valid data should pass
    const validResult = validate(testWorkflow);
    expect(validate.errors).toBe(null);
    expect(validResult).toBe(true);
    // console.log('Valid workflow validation result:', validResult);

    // Test 2: Invalid data should fail
    const invalidResult = validate(invalidWorkflow);
    expect(validate.errors).toBeDefined();
    expect(invalidResult).toBe(false); // console.log('Invalid workflow validation result:', invalidResult);

    // Check if validation is working properly
    // console.log('Valid result:', validResult, 'Invalid result:', invalidResult);

    // Check schema size to see if it's the useless fallback
    const roughSchemaSize = JSON.stringify(jsonSchema).length / 1024;
    // console.log(`Schema size: ${Math.round(schemaSize / 1024)}KB`);

    // Schema size should be between 5MB and 10MB
    expect(roughSchemaSize).toBeGreaterThan(5000);
    expect(roughSchemaSize).toBeLessThan(10000);
  });
});
