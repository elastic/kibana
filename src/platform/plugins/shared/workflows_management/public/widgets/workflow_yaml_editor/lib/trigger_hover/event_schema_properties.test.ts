/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getEventSchemaProperties } from './event_schema_properties';

describe('getEventSchemaProperties', () => {
  /**
   * `getEventSchemaPropertiesRecursive` descends into `ZodArray` when the element is an object, so
   * KQL / hover see the same dotted paths as `extractSchemaPropertyPaths` (e.g. `items.id`).
   */
  it('expands array-of-object into dotted paths (items.id style)', () => {
    const schema = z.object({
      tags: z.array(z.string()),
      items: z.array(
        z.object({
          id: z.string(),
          value: z.number(),
        })
      ),
    });

    const props = getEventSchemaProperties(schema);
    const byName = Object.fromEntries(props.map((p) => [p.name, p.type]));

    expect(byName.tags).toBe('string[]');
    expect(byName.items).toBe('object');
    expect(byName['items.id']).toBe('string');
    expect(byName['items.value']).toBe('number');
  });

  it('unwraps optional array-of-object for nested paths', () => {
    const schema = z.object({
      rows: z
        .array(
          z.object({
            key: z.string(),
          })
        )
        .optional(),
    });

    const props = getEventSchemaProperties(schema);
    const names = props.map((p) => p.name).sort();

    expect(names).toContain('rows');
    expect(names).toContain('rows.key');
  });

  it('shows primitive arrays as element[] (e.g. labels: z.array(z.string()))', () => {
    const schema = z.object({
      labels: z.array(z.string()).optional(),
    });
    const props = getEventSchemaProperties(schema);
    const labels = props.find((p) => p.name === 'labels');
    expect(labels?.type).toBe('string[]');
  });
});
