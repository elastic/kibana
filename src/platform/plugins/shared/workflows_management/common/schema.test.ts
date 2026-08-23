/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
/* eslint-disable import/no-nodejs-modules */
// We only use Node.js modules in this test file to read example yaml files

import { readFileSync } from 'fs';
import Path from 'path';
import { setRuntimeConnectorSpecs } from '@kbn/connector-specs';
import { parseWorkflowYamlToJSON } from '@kbn/workflows-yaml';
import { z } from '@kbn/zod/v4';
import { getWorkflowZodSchema } from './schema';

describe('schema', () => {
  afterEach(() => {
    setRuntimeConnectorSpecs([]);
  });

  describe('getWorkflowZodSchema: elasticsearch steps', () => {
    const examples = [
      {
        name: 'national_parks.yaml',
        yaml: readFileSync(Path.join(__dirname, 'examples', 'national_parks.yaml'), 'utf8'),
      },
      {
        name: 'automated_triaging.yaml',
        yaml: readFileSync(Path.join(__dirname, 'examples', 'automated_triaging.yaml'), 'utf8'),
      },
    ];
    it('should return the correct schema', () => {
      const schema = getWorkflowZodSchema({});
      expect(schema).toBeDefined();
    });
    it('should allow unknown steps and settings in lightweight mode', () => {
      const schema = getWorkflowZodSchema({}, [], { lightweight: true });
      const result = parseWorkflowYamlToJSON(
        [
          'name: Lightweight workflow',
          'enabled: true',
          'triggers:',
          '  - type: manual',
          'settings:',
          '  unknown_setting:',
          '    nested: true',
          'steps:',
          '  - name: custom-step',
          '    type: custom.step',
          '    with:',
          '      arbitrary: true',
        ].join('\n'),
        schema
      );

      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
    });
    it('uses runtime connector action input schemas', () => {
      setRuntimeConnectorSpecs([
        {
          version: '1.0.0',
          metadata: {
            id: '.declarative-test',
            displayName: 'Declarative Test',
            description: 'Test',
            minimumLicense: 'basic',
            supportedFeatureIds: ['workflows'],
          },
          actions: {
            checkIp: {
              input: z.object({ ipAddress: z.ipv4() }).strict(),
              handler: async () => ({}),
            },
          },
          test: { enabled: false, handler: async () => ({}) },
        },
      ]);
      const connectorTypes = {
        '.declarative-test': {
          actionTypeId: '.declarative-test',
          displayName: 'Declarative Test',
          instances: [
            {
              id: 'connector-1',
              name: 'Connector',
              isPreconfigured: false,
              isDeprecated: false,
            },
          ],
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic' as const,
          subActions: [{ name: 'checkIp', displayName: 'Check IP' }],
        },
      };
      const workflow = (ipAddress: string) =>
        [
          'name: Runtime connector schema',
          'enabled: true',
          'triggers:',
          '  - type: manual',
          'steps:',
          '  - name: check_ip',
          '    type: declarative-test.checkIp',
          '    connector-id: connector-1',
          '    with:',
          `      ipAddress: ${ipAddress}`,
        ].join('\n');
      const workflowSchema = getWorkflowZodSchema(connectorTypes);

      expect(parseWorkflowYamlToJSON(workflow('192.0.2.1'), workflowSchema).success).toBe(true);
      expect(parseWorkflowYamlToJSON(workflow('not-an-ip'), workflowSchema).success).toBe(false);
    });
    examples.forEach((example) => {
      it(`should parse ${example.name} with zod schema`, () => {
        const schema = getWorkflowZodSchema({});
        const result = parseWorkflowYamlToJSON(example.yaml, schema);
        expect(result.error).toBeUndefined();
        expect(result.success).toBe(true);
      });
    });
  });
});
