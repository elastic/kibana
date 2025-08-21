/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  generateYamlSchemaFromConnectors,
  getJsonSchemaFromYamlSchema,
} from './lib/generate_yaml_schema';

describe('API step schemas', () => {
  const strictSchema = generateYamlSchemaFromConnectors([], false);
  const looseSchema = generateYamlSchemaFromConnectors([], true);

  test('validates elasticsearch.request step (strict)', () => {
    const workflow = {
      name: 'wf',
      triggers: [{ type: 'triggers.elastic.manual', enabled: true }],
      steps: [
        {
          type: 'elasticsearch.request',
          name: 'es',
          request: { method: 'GET', path: '/_cluster/health' },
        },
      ],
    };
    const result = strictSchema.safeParse(workflow);
    expect(result.success).toBe(true);
  });

  test('validates kibana.request step (strict)', () => {
    const workflow = {
      name: 'wf',
      triggers: [{ type: 'triggers.elastic.manual', enabled: true }],
      steps: [
        {
          type: 'kibana.request',
          name: 'kbn',
          request: { method: 'GET', path: '/api/status' },
        },
      ],
    };
    const result = strictSchema.safeParse(workflow);
    expect(result.success).toBe(true);
  });

  test('rejects elasticsearch.request with invalid path (no leading /)', () => {
    const workflow = {
      name: 'wf',
      triggers: [{ type: 'triggers.elastic.manual', enabled: true }],
      steps: [
        {
          type: 'elasticsearch.request',
          name: 'es',
          request: { method: 'GET', path: 'cluster/health' },
        },
      ],
    };
    const result = strictSchema.safeParse(workflow);
    expect(result.success).toBe(false);
  });

  test('rejects kibana.request with non-/api path', () => {
    const workflow = {
      name: 'wf',
      triggers: [{ type: 'triggers.elastic.manual', enabled: true }],
      steps: [
        {
          type: 'kibana.request',
          name: 'kbn',
          request: { method: 'GET', path: '/status' },
        },
      ],
    } as any;
    const result = strictSchema.safeParse(workflow);
    expect(result.success).toBe(false);
  });

  test('rejects kibana.request with HEAD method', () => {
    const workflow = {
      name: 'wf',
      triggers: [{ type: 'triggers.elastic.manual', enabled: true }],
      steps: [
        {
          type: 'kibana.request',
          name: 'kbn',
          request: { method: 'HEAD', path: '/api/status' },
        },
      ],
    } as any; // let zod validate
    const result = strictSchema.safeParse(workflow);
    expect(result.success).toBe(false);
  });

  test('JSON schema includes api step types', () => {
    const json = getJsonSchemaFromYamlSchema(strictSchema);
    const jsonStr = JSON.stringify(json);
    expect(jsonStr).toContain('elasticsearch.request');
    expect(jsonStr).toContain('kibana.request');
  });

  test('loose schema accepts partial step stubs with type only', () => {
    const workflow = {
      // name missing on purpose
      triggers: [{ type: 'triggers.elastic.manual' }],
      steps: [
        {
          type: 'elasticsearch.request',
          // other fields omitted on purpose
        },
      ],
    } as any;
    const result = looseSchema.safeParse(workflow);
    expect(result.success).toBe(true);
  });
});
