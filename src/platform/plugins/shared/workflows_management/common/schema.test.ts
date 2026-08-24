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
import type { ConnectorTypeInfo } from '@kbn/workflows';
import { parseWorkflowYamlToJSON } from '@kbn/workflows-yaml';
import { z } from '@kbn/zod/v4';
import { getWorkflowZodSchema } from './schema';

describe('schema', () => {
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
      const connectorTypes: Record<string, ConnectorTypeInfo> = {
        '.declarative-test': {
          actionTypeId: '.declarative-test',
          displayName: 'Declarative Test',
          instances: [
            {
              id: 'connector-v1',
              name: 'Connector v1',
              isPreconfigured: false,
              isDeprecated: false,
              specVersion: '1.0.0',
              actionInputSchemas: {
                checkIp: z.toJSONSchema(z.object({ ipAddress: z.ipv4() }).strict()),
                legacyAction: z.toJSONSchema(z.object({ message: z.string().min(1) }).strict()),
              },
            },
            {
              id: 'connector-v2',
              name: 'Connector v2',
              isPreconfigured: false,
              isDeprecated: false,
              specVersion: '2.0.0',
              actionInputSchemas: {
                checkIp: z.toJSONSchema(z.object({ hostname: z.string().min(1) }).strict()),
              },
            },
          ],
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic' as const,
          subActions: [
            {
              name: 'checkIp',
              displayName: 'Check IP',
              inputSchema: z.toJSONSchema(z.object({ ipAddress: z.ipv4() }).strict()),
            },
            {
              name: 'legacyAction',
              displayName: 'Legacy Action',
            },
          ],
        },
      };
      const workflow = (connectorId: string, input: string, action = 'checkIp') =>
        [
          'name: Runtime connector schema',
          'enabled: true',
          'triggers:',
          '  - type: manual',
          'steps:',
          '  - name: check_ip',
          `    type: declarative-test.${action}`,
          `    connector-id: ${connectorId}`,
          '    with:',
          `      ${input}`,
        ].join('\n');
      const workflowSchema = getWorkflowZodSchema(connectorTypes);

      expect(
        parseWorkflowYamlToJSON(workflow('connector-v1', 'ipAddress: 192.0.2.1'), workflowSchema)
          .success
      ).toBe(true);
      expect(
        parseWorkflowYamlToJSON(workflow('connector-v1', 'hostname: example.com'), workflowSchema)
          .success
      ).toBe(false);
      expect(
        parseWorkflowYamlToJSON(workflow('connector-v2', 'hostname: example.com'), workflowSchema)
          .success
      ).toBe(true);
      expect(
        parseWorkflowYamlToJSON(workflow('connector-v2', 'ipAddress: 192.0.2.1'), workflowSchema)
          .success
      ).toBe(false);
      expect(
        parseWorkflowYamlToJSON(
          workflow('connector-v1', 'message: supported', 'legacyAction'),
          workflowSchema
        ).success
      ).toBe(true);
      expect(
        parseWorkflowYamlToJSON(
          workflow('connector-v2', 'message: unsupported', 'legacyAction'),
          workflowSchema
        ).success
      ).toBe(false);

      const connectorType = connectorTypes['.declarative-test'];
      const v2OnlySchema = getWorkflowZodSchema({
        '.declarative-test': {
          ...connectorType,
          instances: [connectorType.instances[1]],
        },
      });
      expect(
        parseWorkflowYamlToJSON(
          workflow('connector-v2', 'message: unsupported', 'legacyAction'),
          v2OnlySchema
        ).success
      ).toBe(false);
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
