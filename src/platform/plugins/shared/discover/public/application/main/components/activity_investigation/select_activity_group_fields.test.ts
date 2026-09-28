/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { selectActivityGroupFields } from './select_activity_group_fields';

describe('selectActivityGroupFields', () => {
  it('keeps supported output types without changing the input', () => {
    const columns = Object.freeze([
      { name: 'custom.plan', type: 'keyword' },
      { name: 'success', type: 'boolean' },
      { name: 'client.ip', type: 'ip' },
      { name: 'timestamp', type: 'date' },
      { name: 'duration', type: 'long' },
      { name: 'message', type: 'text' },
    ]);

    const selected = selectActivityGroupFields(columns);

    expect(selected).toEqual(columns.slice(0, 3));
    expect(selected).not.toBe(columns);
  });

  it('prioritizes profile fields while preserving order within both groups', () => {
    const columns = Object.freeze([
      { name: 'custom.plan', type: 'keyword' },
      { name: 'host.name', type: 'keyword' },
      { name: 'service.name', type: 'keyword' },
      { name: 'custom.region', type: 'keyword' },
    ]);

    const selected = selectActivityGroupFields(columns, [
      'service.name',
      'host.name',
      'service.name',
      'absent.field',
    ]);

    expect(selected).toEqual([columns[1], columns[2], columns[0], columns[3]]);
    expect(columns[0].name).toBe('custom.plan');
  });

  it('does not let a recommendation override exclusions or type compatibility', () => {
    const columns = [
      { name: 'trace.id', type: 'keyword' },
      { name: 'span_id', type: 'keyword' },
      { name: 'ecs.version', type: 'keyword' },
      { name: '_id', type: 'keyword' },
      { name: 'http.response.status_code', type: 'long' },
      { name: 'service.name', type: 'keyword' },
    ];

    expect(
      selectActivityGroupFields(
        columns,
        columns.map(({ name }) => name)
      )
    ).toEqual([columns[5]]);
  });

  it('retains entity IDs and custom fields rather than applying an ECS allowlist', () => {
    const columns = [
      { name: 'ecs.version', type: 'keyword' },
      { name: 'customer.id', type: 'keyword' },
      { name: 'container.id', type: 'keyword' },
      { name: 'custom.trace.id', type: 'keyword' },
      { name: 'http.request.method', type: 'keyword' },
      { name: '_index', type: 'keyword' },
    ];

    expect(selectActivityGroupFields(columns)).toEqual(columns.slice(1));
  });

  it('does not truncate custom fields when no profile is available', () => {
    const columns = Array.from({ length: 110 }, (_, index) => ({
      name: `custom.field_${index}`,
      type: 'keyword',
    }));

    expect(selectActivityGroupFields(columns)).toEqual(columns);
    expect(selectActivityGroupFields([])).toEqual([]);
  });
});
