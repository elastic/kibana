/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const { componentizeObjectSchemas } = require('./componentize');

/**
 * Tests to figure out the best componentization strategy for the `/api/actions/connector/{id}` API specification.
 * Uses the real `/api/actions/connector/{id}` GET API specification from Kibana main branch.
 *
 * Note: The existing test in componentize.test.js uses a synthetic example with config.properties
 * (from/host), but the real Kibana spec has an empty config object (just additionalProperties: {}).
 * This test uses the actual real spec structure.
 *
 * Open questions:
 * 1. Primitives - Extract or Inline?
 * 2. Property Removal - All or Keep All?
 * 3. Metadata - Strip or Preserve?
 * 4. Empty Objects - Extract or Skip?
 */

describe('Componentization strategy decisions - /api/actions/connector/{id}', () => {
  let tempDir;
  let mockLog;

  // Taken from oas_docs/output/kibana.yaml in `main` branch
  // This is the actual GET /api/actions/connector/{id} response schema, inlined
  // Note: The config property is an empty object (additionalProperties: {}, type: object)
  // with no properties, which is perfect for testing the extractEmpty strategy
  const realConnectorSpec = {
    openapi: '3.0.3',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/api/actions/connector/{id}': {
        get: {
          operationId: 'get-actions-connector-id',
          parameters: [
            {
              description: 'An identifier for the connector.',
              in: 'path',
              name: 'id',
              required: true,
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: {
                    additionalProperties: false,
                    type: 'object',
                    properties: {
                      config: {
                        additionalProperties: {},
                        type: 'object',
                      },
                      connector_type_id: {
                        description: 'The connector type identifier.',
                        type: 'string',
                      },
                      id: {
                        description: 'The identifier for the connector.',
                        type: 'string',
                      },
                      is_connector_type_deprecated: {
                        description: 'Indicates whether the connector type is deprecated.',
                        type: 'boolean',
                      },
                      is_deprecated: {
                        description: 'Indicates whether the connector is deprecated.',
                        type: 'boolean',
                      },
                      is_missing_secrets: {
                        description: 'Indicates whether the connector is missing secrets.',
                        type: 'boolean',
                      },
                      is_preconfigured: {
                        description:
                          'Indicates whether the connector is preconfigured. If true, the `config` and `is_missing_secrets` properties are omitted from the response.',
                        type: 'boolean',
                      },
                      is_system_action: {
                        description: 'Indicates whether the connector is used for system actions.',
                        type: 'boolean',
                      },
                      name: {
                        description: ' The name of the connector.',
                        type: 'string',
                      },
                    },
                    required: [
                      'id',
                      'name',
                      'connector_type_id',
                      'is_preconfigured',
                      'is_deprecated',
                      'is_system_action',
                      'is_connector_type_deprecated',
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'componentize-connector-test-'));
    mockLog = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Helper to generate all boolean combinations
  function generateBooleanCombinations(...labels) {
    const combinations = [];
    const length = 2 ** labels.length;

    for (let i = 0; i < length; i++) {
      const strategy = {};
      labels.forEach((label, index) => {
        strategy[label] = Boolean((i >> index) & 1);
      });
      combinations.push(strategy);
    }

    return combinations;
  }

  // Generate all 16 combinations (2^4)
  const strategies = generateBooleanCombinations(
    'extractPrimitives',
    'removeProperties',
    'preserveMetadata',
    'extractEmpty'
  );

  describe('Strategy comparison tests', () => {
    test.each(strategies)(
      'Strategy: extractPrimitives=$extractPrimitives, removeProperties=$removeProperties, preserveMetadata=$preserveMetadata, extractEmpty=$extractEmpty',
      async (strategy) => {
        const testFile = path.join(tempDir, `test-strategy-${JSON.stringify(strategy)}.yaml`);
        const testDoc = JSON.parse(JSON.stringify(realConnectorSpec));
        fs.writeFileSync(testFile, yaml.dump(testDoc));

        // Pass strategy options to componentizeObjectSchemas
        await componentizeObjectSchemas(testFile, {
          log: mockLog,
          ...strategy,
        });

        const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

        // Basic validation
        expect(result.components).toBeDefined();
        expect(result.components.schemas).toBeDefined();

        // Count components
        const componentCount = Object.keys(result.components.schemas).length;
        console.log(`Strategy (${JSON.stringify(strategy)}): ${componentCount} components created`);

        // Verify top-level schema was extracted
        expect(
          result.paths['/api/actions/connector/{id}'].get.responses['200'].content[
            'application/json'
          ].schema
        ).toEqual({
          $ref: '#/components/schemas/ApiActionsConnector_Get_Response_200',
        });

        // Verify component exists
        expect(result.components.schemas).toHaveProperty('ApiActionsConnector_Get_Response_200');

        // Store result for comparison
        const outputFile = path.join(tempDir, `output-strategy-${JSON.stringify(strategy)}.yaml`);
        fs.writeFileSync(outputFile, yaml.dump(result, { lineWidth: -1 }));
      }
    );
  });

  describe('Detailed strategy analysis', () => {
    it('should show differences between extractPrimitives strategies', async () => {
      const strategy1 = {
        extractPrimitives: false,
        removeProperties: false,
        preserveMetadata: true,
        extractEmpty: false,
      };
      const strategy2 = {
        extractPrimitives: true,
        removeProperties: false,
        preserveMetadata: true,
        extractEmpty: false,
      };

      const testFile1 = path.join(tempDir, 'test-primitives-false.yaml');
      const testFile2 = path.join(tempDir, 'test-primitives-true.yaml');

      fs.writeFileSync(testFile1, yaml.dump(JSON.parse(JSON.stringify(realConnectorSpec))));
      fs.writeFileSync(testFile2, yaml.dump(JSON.parse(JSON.stringify(realConnectorSpec))));

      await componentizeObjectSchemas(testFile1, { log: mockLog, ...strategy1 });
      await componentizeObjectSchemas(testFile2, { log: mockLog, ...strategy2 });

      const result1 = yaml.load(fs.readFileSync(testFile1, 'utf8'));
      const result2 = yaml.load(fs.readFileSync(testFile2, 'utf8'));

      const components1 = Object.keys(result1.components.schemas);
      const components2 = Object.keys(result2.components.schemas);

      console.log('Without extracting primitives:', components1);
      console.log('With extracting primitives:', components2);

      // When extracting primitives, we should have more components
      // (one for each primitive prop: connector_type_id, id.)
      expect(components2.length).toBeGreaterThanOrEqual(components1.length);
    });

    it('should show differences between removeProperties strategies', async () => {
      const testFile1 = path.join(tempDir, 'test-remove-false.yaml');
      const testFile2 = path.join(tempDir, 'test-remove-true.yaml');

      fs.writeFileSync(testFile1, yaml.dump(JSON.parse(JSON.stringify(realConnectorSpec))));
      fs.writeFileSync(testFile2, yaml.dump(JSON.parse(JSON.stringify(realConnectorSpec))));

      await componentizeObjectSchemas(testFile1, {
        log: mockLog,
        extractPrimitives: false,
        removeProperties: false,
        preserveMetadata: true,
        extractEmpty: false,
      });
      await componentizeObjectSchemas(testFile2, {
        log: mockLog,
        extractPrimitives: false,
        removeProperties: true,
        preserveMetadata: true,
        extractEmpty: false,
      });

      const result1 = yaml.load(fs.readFileSync(testFile1, 'utf8'));
      const result2 = yaml.load(fs.readFileSync(testFile2, 'utf8'));

      const parent1 = result1.components.schemas.ApiActionsConnector_Get_Response_200;
      const parent2 = result2.components.schemas.ApiActionsConnector_Get_Response_200;

      // for removeProperties: true, remove extracted props should be from parent
      if (parent1.properties && parent2.properties) {
        const props1 = Object.keys(parent1.properties || {});
        const props2 = Object.keys(parent2.properties || {});
        console.log('Properties in parent (remove=false):', props1);
        console.log('Properties in parent (remove=true):', props2);
      }
    });

    it('should show differences between preserveMetadata strategies', async () => {
      const testFile1 = path.join(tempDir, 'test-metadata-true.yaml');
      const testFile2 = path.join(tempDir, 'test-metadata-false.yaml');

      fs.writeFileSync(testFile1, yaml.dump(JSON.parse(JSON.stringify(realConnectorSpec))));
      fs.writeFileSync(testFile2, yaml.dump(JSON.parse(JSON.stringify(realConnectorSpec))));

      await componentizeObjectSchemas(testFile1, {
        log: mockLog,
        extractPrimitives: false,
        removeProperties: false,
        preserveMetadata: true,
        extractEmpty: false,
      });
      await componentizeObjectSchemas(testFile2, {
        log: mockLog,
        extractPrimitives: false,
        removeProperties: false,
        preserveMetadata: false,
        extractEmpty: false,
      });

      const result1 = yaml.load(fs.readFileSync(testFile1, 'utf8'));
      const result2 = yaml.load(fs.readFileSync(testFile2, 'utf8'));

      // Find a component that should have metadata
      const component1 = Object.values(result1.components.schemas).find(
        (c) => c.additionalProperties !== undefined || c.description !== undefined
      );
      const component2 = Object.values(result2.components.schemas).find(
        (c) => c.additionalProperties !== undefined || c.description !== undefined
      );

      if (component1 && component2) {
        console.log(
          'With metadata preserved:',
          JSON.stringify(component1, null, 2).substring(0, 200)
        );
        console.log(
          'With metadata stripped:',
          JSON.stringify(component2, null, 2).substring(0, 200)
        );
      }
    });

    it('should show differences between extractEmpty strategies', async () => {
      const testFile1 = path.join(tempDir, 'test-empty-false.yaml');
      const testFile2 = path.join(tempDir, 'test-empty-true.yaml');

      fs.writeFileSync(testFile1, yaml.dump(JSON.parse(JSON.stringify(realConnectorSpec))));
      fs.writeFileSync(testFile2, yaml.dump(JSON.parse(JSON.stringify(realConnectorSpec))));

      await componentizeObjectSchemas(testFile1, {
        log: mockLog,
        extractPrimitives: false,
        removeProperties: false,
        preserveMetadata: true,
        extractEmpty: false,
      });
      await componentizeObjectSchemas(testFile2, {
        log: mockLog,
        extractPrimitives: false,
        removeProperties: false,
        preserveMetadata: true,
        extractEmpty: true,
      });

      const result1 = yaml.load(fs.readFileSync(testFile1, 'utf8'));
      const result2 = yaml.load(fs.readFileSync(testFile2, 'utf8'));

      // The config prop is an empty object - it should be extracted when extractEmpty is true
      const emptyComponents1 = Object.values(result1.components.schemas).filter(
        (c) => c.type === 'object' && (!c.properties || Object.keys(c.properties).length === 0)
      );
      const emptyComponents2 = Object.values(result2.components.schemas).filter(
        (c) => c.type === 'object' && (!c.properties || Object.keys(c.properties).length === 0)
      );

      console.log('Empty components (extractEmpty=false):', emptyComponents1.length);
      console.log('Empty components (extractEmpty=true):', emptyComponents2.length);

      // When extractEmpty is true, we should extract the config object
      expect(emptyComponents2.length).toBeGreaterThanOrEqual(emptyComponents1.length);
    });
  });

  describe('Complex schema with nested properties and oneOf/anyOf - /api/fleet/outputs POST', () => {
    // Based on /api/fleet/outputs POST request from Kibana spec
    // This has: top-level anyOf, nested object properties, and nested anyOf in secrets.ssl.key
    const complexFleetOutputsSpec = {
      openapi: '3.0.3',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/api/fleet/outputs': {
          post: {
            operationId: 'post-fleet-outputs',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    anyOf: [
                      {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                          name: {
                            type: 'string',
                            description: 'The name of the output.',
                          },
                          type: {
                            type: 'string',
                            enum: ['elasticsearch'],
                            description: 'The output type.',
                          },
                          hosts: {
                            type: 'array',
                            items: {
                              type: 'string',
                              format: 'uri',
                            },
                            minItems: 1,
                            maxItems: 10,
                            description: 'The Elasticsearch hosts.',
                          },
                          secrets: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                              ssl: {
                                type: 'object',
                                additionalProperties: false,
                                properties: {
                                  key: {
                                    anyOf: [
                                      {
                                        type: 'object',
                                        additionalProperties: false,
                                        properties: {
                                          id: {
                                            type: 'string',
                                            description: 'The secret ID.',
                                          },
                                          hash: {
                                            type: 'string',
                                            description: 'The secret hash.',
                                          },
                                        },
                                        required: ['id'],
                                      },
                                      {
                                        type: 'string',
                                        description: 'The secret value as a string.',
                                      },
                                    ],
                                    description:
                                      'The SSL key, either as a secret reference or direct value.',
                                  },
                                },
                                description: 'SSL configuration.',
                              },
                            },
                            description: 'Secret values for the output.',
                          },
                          shipper: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                              compression_level: {
                                type: 'number',
                                minimum: 1,
                                maximum: 9,
                                description: 'Compression level.',
                              },
                            },
                            description: 'Shipper configuration.',
                          },
                        },
                        required: ['name', 'type', 'hosts'],
                      },
                      {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                          name: {
                            type: 'string',
                            description: 'The name of the output.',
                          },
                          type: {
                            type: 'string',
                            enum: ['kafka'],
                            description: 'The output type.',
                          },
                          hosts: {
                            type: 'array',
                            items: {
                              type: 'string',
                            },
                            description: 'The Kafka hosts.',
                          },
                        },
                        required: ['name', 'type'],
                      },
                    ],
                  },
                },
              },
            },
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        item: {
                          type: 'object',
                          properties: {
                            id: {
                              type: 'string',
                            },
                            name: {
                              type: 'string',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    describe('Strategy comparison tests', () => {
      test.each(strategies)(
        'Strategy: extractPrimitives=$extractPrimitives, removeProperties=$removeProperties, preserveMetadata=$preserveMetadata, extractEmpty=$extractEmpty',
        async (strategy) => {
          const testFile = path.join(
            tempDir,
            `test-fleet-outputs-strategy-${JSON.stringify(strategy)}.yaml`
          );
          const testDoc = JSON.parse(JSON.stringify(complexFleetOutputsSpec));
          fs.writeFileSync(testFile, yaml.dump(testDoc));

          // Pass strategy options to componentizeObjectSchemas
          await componentizeObjectSchemas(testFile, {
            log: mockLog,
            ...strategy,
          });

          const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

          // Basic validation
          expect(result.components).toBeDefined();
          expect(result.components.schemas).toBeDefined();

          // Count components
          const componentCount = Object.keys(result.components.schemas).length;
          console.log(
            `Fleet Outputs Strategy (${JSON.stringify(
              strategy
            )}): ${componentCount} components created`
          );

          // Verify top-level request schema was extracted
          expect(
            result.paths['/api/fleet/outputs'].post.requestBody.content['application/json'].schema
          ).toEqual({
            $ref: '#/components/schemas/ApiFleetOutputs_Post_Request',
          });

          // Verify component exists
          expect(result.components.schemas).toHaveProperty('ApiFleetOutputs_Post_Request');

          // Store result for comparison
          const outputFile = path.join(
            tempDir,
            `output-fleet-outputs-strategy-${JSON.stringify(strategy)}.yaml`
          );
          fs.writeFileSync(outputFile, yaml.dump(result, { lineWidth: -1 }));
        }
      );
    });

    describe('Detailed strategy analysis', () => {
      it('should show differences between extractPrimitives strategies', async () => {
        const strategy1 = {
          extractPrimitives: false,
          removeProperties: false,
          preserveMetadata: true,
          extractEmpty: false,
        };
        const strategy2 = {
          extractPrimitives: true,
          removeProperties: false,
          preserveMetadata: true,
          extractEmpty: false,
        };

        const testFile1 = path.join(tempDir, 'test-fleet-primitives-false.yaml');
        const testFile2 = path.join(tempDir, 'test-fleet-primitives-true.yaml');

        fs.writeFileSync(testFile1, yaml.dump(JSON.parse(JSON.stringify(complexFleetOutputsSpec))));
        fs.writeFileSync(testFile2, yaml.dump(JSON.parse(JSON.stringify(complexFleetOutputsSpec))));

        await componentizeObjectSchemas(testFile1, { log: mockLog, ...strategy1 });
        await componentizeObjectSchemas(testFile2, { log: mockLog, ...strategy2 });

        const result1 = yaml.load(fs.readFileSync(testFile1, 'utf8'));
        const result2 = yaml.load(fs.readFileSync(testFile2, 'utf8'));

        const components1 = Object.keys(result1.components.schemas);
        const components2 = Object.keys(result2.components.schemas);

        console.log('Fleet Outputs - Without extracting primitives:', components1);
        console.log('Fleet Outputs - With extracting primitives:', components2);

        // When extracting primitives, we should have more components
        expect(components2.length).toBeGreaterThanOrEqual(components1.length);
      });

      it('should show differences between removeProperties strategies', async () => {
        const testFile1 = path.join(tempDir, 'test-fleet-remove-false.yaml');
        const testFile2 = path.join(tempDir, 'test-fleet-remove-true.yaml');

        fs.writeFileSync(testFile1, yaml.dump(JSON.parse(JSON.stringify(complexFleetOutputsSpec))));
        fs.writeFileSync(testFile2, yaml.dump(JSON.parse(JSON.stringify(complexFleetOutputsSpec))));

        await componentizeObjectSchemas(testFile1, {
          log: mockLog,
          extractPrimitives: false,
          removeProperties: false,
          preserveMetadata: true,
          extractEmpty: false,
        });
        await componentizeObjectSchemas(testFile2, {
          log: mockLog,
          extractPrimitives: false,
          removeProperties: true,
          preserveMetadata: true,
          extractEmpty: false,
        });

        const result1 = yaml.load(fs.readFileSync(testFile1, 'utf8'));
        const result2 = yaml.load(fs.readFileSync(testFile2, 'utf8'));

        const parent1 = result1.components.schemas.ApiFleetOutputs_Post_Request;
        const parent2 = result2.components.schemas.ApiFleetOutputs_Post_Request;

        // When removeProperties is true, extracted properties should be removed from parent
        if (parent1.anyOf && parent2.anyOf) {
          const firstItem1 = parent1.anyOf[0];
          const firstItem2 = parent2.anyOf[0];
          if (firstItem1.$ref && firstItem2.$ref) {
            const item1 = result1.components.schemas[firstItem1.$ref.split('/').pop()];
            const item2 = result2.components.schemas[firstItem2.$ref.split('/').pop()];
            if (item1?.properties && item2?.properties) {
              const props1 = Object.keys(item1.properties || {});
              const props2 = Object.keys(item2.properties || {});
              console.log('Fleet Outputs - Properties in parent (remove=false):', props1);
              console.log('Fleet Outputs - Properties in parent (remove=true):', props2);
            }
          }
        }
      });

      it('should show differences between preserveMetadata strategies', async () => {
        const testFile1 = path.join(tempDir, 'test-fleet-metadata-true.yaml');
        const testFile2 = path.join(tempDir, 'test-fleet-metadata-false.yaml');

        fs.writeFileSync(testFile1, yaml.dump(JSON.parse(JSON.stringify(complexFleetOutputsSpec))));
        fs.writeFileSync(testFile2, yaml.dump(JSON.parse(JSON.stringify(complexFleetOutputsSpec))));

        await componentizeObjectSchemas(testFile1, {
          log: mockLog,
          extractPrimitives: false,
          removeProperties: false,
          preserveMetadata: true,
          extractEmpty: false,
        });
        await componentizeObjectSchemas(testFile2, {
          log: mockLog,
          extractPrimitives: false,
          removeProperties: false,
          preserveMetadata: false,
          extractEmpty: false,
        });

        const result1 = yaml.load(fs.readFileSync(testFile1, 'utf8'));
        const result2 = yaml.load(fs.readFileSync(testFile2, 'utf8'));

        // Find a component that should have metadata
        const component1 = Object.values(result1.components.schemas).find(
          (c) => c.additionalProperties !== undefined || c.description !== undefined
        );
        const component2 = Object.values(result2.components.schemas).find(
          (c) => c.additionalProperties !== undefined || c.description !== undefined
        );

        if (component1 && component2) {
          console.log(
            'Fleet Outputs - With metadata preserved:',
            JSON.stringify(component1, null, 2).substring(0, 200)
          );
          console.log(
            'Fleet Outputs - With metadata stripped:',
            JSON.stringify(component2, null, 2).substring(0, 200)
          );
        }
      });

      it('should show differences between extractEmpty strategies', async () => {
        const testFile1 = path.join(tempDir, 'test-fleet-empty-false.yaml');
        const testFile2 = path.join(tempDir, 'test-fleet-empty-true.yaml');

        fs.writeFileSync(testFile1, yaml.dump(JSON.parse(JSON.stringify(complexFleetOutputsSpec))));
        fs.writeFileSync(testFile2, yaml.dump(JSON.parse(JSON.stringify(complexFleetOutputsSpec))));

        await componentizeObjectSchemas(testFile1, {
          log: mockLog,
          extractPrimitives: false,
          removeProperties: false,
          preserveMetadata: true,
          extractEmpty: false,
        });
        await componentizeObjectSchemas(testFile2, {
          log: mockLog,
          extractPrimitives: false,
          removeProperties: false,
          preserveMetadata: true,
          extractEmpty: true,
        });

        const result1 = yaml.load(fs.readFileSync(testFile1, 'utf8'));
        const result2 = yaml.load(fs.readFileSync(testFile2, 'utf8'));

        // Count empty components
        const emptyComponents1 = Object.values(result1.components.schemas).filter(
          (c) => c.type === 'object' && (!c.properties || Object.keys(c.properties).length === 0)
        );
        const emptyComponents2 = Object.values(result2.components.schemas).filter(
          (c) => c.type === 'object' && (!c.properties || Object.keys(c.properties).length === 0)
        );

        console.log(
          'Fleet Outputs - Empty components (extractEmpty=false):',
          emptyComponents1.length
        );
        console.log(
          'Fleet Outputs - Empty components (extractEmpty=true):',
          emptyComponents2.length
        );

        // When extractEmpty is true, we should extract empty objects
        expect(emptyComponents2.length).toBeGreaterThanOrEqual(emptyComponents1.length);
      });

      it('should verify nested anyOf extraction', async () => {
        const testFile = path.join(tempDir, 'test-fleet-nested-anyof.yaml');
        fs.writeFileSync(testFile, yaml.dump(JSON.parse(JSON.stringify(complexFleetOutputsSpec))));

        await componentizeObjectSchemas(testFile, {
          log: mockLog,
          extractPrimitives: false,
          removeProperties: false,
          preserveMetadata: true,
          extractEmpty: false,
        });

        const result = yaml.load(fs.readFileSync(testFile, 'utf8'));

        // Verify top-level request schema was extracted
        expect(
          result.paths['/api/fleet/outputs'].post.requestBody.content['application/json'].schema
        ).toEqual({
          $ref: '#/components/schemas/ApiFleetOutputs_Post_Request',
        });

        // Verify component exists
        expect(result.components.schemas).toHaveProperty('ApiFleetOutputs_Post_Request');

        const requestComponent = result.components.schemas.ApiFleetOutputs_Post_Request;

        // Verify anyOf was extracted
        expect(requestComponent.anyOf).toBeDefined();
        expect(Array.isArray(requestComponent.anyOf)).toBe(true);
        expect(requestComponent.anyOf.length).toBe(2);

        // Verify nested properties were extracted
        // The secrets.ssl.key anyOf should be extracted
        const firstAnyOfItem = requestComponent.anyOf[0];
        if (firstAnyOfItem.$ref) {
          const firstItemComponent =
            result.components.schemas[firstAnyOfItem.$ref.split('/').pop()];
          if (firstItemComponent?.properties?.secrets?.$ref) {
            const secretsComponent =
              result.components.schemas[
                firstItemComponent.properties.secrets.$ref.split('/').pop()
              ];
            if (secretsComponent?.properties?.ssl?.$ref) {
              const sslComponent =
                result.components.schemas[secretsComponent.properties.ssl.$ref.split('/').pop()];
              if (sslComponent?.properties?.key?.anyOf) {
                // The nested anyOf should be extracted
                expect(Array.isArray(sslComponent.properties.key.anyOf)).toBe(true);
                expect(sslComponent.properties.key.anyOf.length).toBe(2);
              }
            }
          }
        }

        const componentCount = Object.keys(result.components.schemas).length;
        console.log(
          `Fleet Outputs - Complex schema componentization created ${componentCount} components`
        );
      });
    });
  });
});
