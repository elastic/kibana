/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { synth } from '@elastic/esql';
import type { ESQLColumnData } from '../types';
import { columnsAfter, REGISTERED_DOMAIN_COLUMNS } from './columns_after';

describe('REGISTERED_DOMAIN > columnsAfter', () => {
  const previousColumns: ESQLColumnData[] = [
    { name: 'host', type: 'keyword', userDefined: false },
    { name: 'message', type: 'text', userDefined: false },
  ];
  const command = synth.cmd`REGISTERED_DOMAIN parts = host`;

  it('adds 4 prefixed columns from REGISTERED_DOMAIN', () => {
    const result = columnsAfter(command, previousColumns);

    expect(result).toHaveLength(previousColumns.length + REGISTERED_DOMAIN_COLUMNS.length);

    const newColumns = result.slice(previousColumns.length);
    expect(newColumns).toEqual(
      REGISTERED_DOMAIN_COLUMNS.map(({ suffix, type }) => ({
        name: `parts.${suffix}`,
        type,
        userDefined: false,
      }))
    );
  });

  it('preserves previous columns', () => {
    const result = columnsAfter(command, previousColumns);

    expect(result.slice(0, 2)).toEqual(previousColumns);
  });
});
