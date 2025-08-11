/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { parseWorkflowYamlToJSON } from './yaml_utils';

describe('parseWorkflowYamlToJSON', () => {
  it('should parse yaml to json according to zod schema', () => {
    const yaml = 'a: b';
    const result = parseWorkflowYamlToJSON(yaml, z.object({ a: z.string() }));
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ a: 'b' });
  });

  it('should fail if yaml does not match zod schema', () => {
    const yaml = 'a: b';
    const result = parseWorkflowYamlToJSON(yaml, z.object({ a: z.number() }));
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should fail if yaml is invalid', () => {
    const yaml = 'invalid yaml';
    const result = parseWorkflowYamlToJSON(yaml, z.object({ a: z.string() }));
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should quote template expressions', () => {
    const yaml = 'a: {{b}}';
    const result = parseWorkflowYamlToJSON(yaml, z.object({ a: z.string() }));
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ a: '{{b}}' });
  });
});
