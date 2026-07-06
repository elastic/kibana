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
import { columnsAfter } from './columns_after';

const previousColumns: ESQLColumnData[] = [
  { name: 'uaString', type: 'keyword', userDefined: false },
];

const col = (suffix: string): ESQLColumnData => ({
  name: `ua.${suffix}`,
  type: 'keyword',
  userDefined: false,
});

const ALL_DEFAULT_COLUMNS = [
  col('name'),
  col('version'),
  col('os.name'),
  col('os.version'),
  col('os.full'),
  col('device.name'),
];

describe('USER_AGENT > columnsAfter', () => {
  it('adds all default columns when no options are provided', () => {
    const command = synth.cmd`USER_AGENT ua = uaString`;
    const result = columnsAfter(command, previousColumns);

    expect(result.slice(previousColumns.length)).toEqual(ALL_DEFAULT_COLUMNS);
  });

  it('preserves previous columns', () => {
    const command = synth.cmd`USER_AGENT ua = uaString`;
    const result = columnsAfter(command, previousColumns);

    expect(result.slice(0, previousColumns.length)).toEqual(previousColumns);
  });

  it('filters columns to only those in the properties list', () => {
    const command = synth.cmd`USER_AGENT ua = uaString WITH { "properties": ["name"] }`;
    const result = columnsAfter(command, previousColumns);

    expect(result.slice(previousColumns.length)).toEqual([col('name')]);
  });

  it('includes all columns for each selected property group', () => {
    const command = synth.cmd`USER_AGENT ua = uaString WITH { "properties": ["os", "version"] }`;
    const result = columnsAfter(command, previousColumns);

    expect(result.slice(previousColumns.length)).toEqual([
      col('os.name'),
      col('os.version'),
      col('os.full'),
      col('version'),
    ]);
  });

  it('does not include device.type by default', () => {
    const command = synth.cmd`USER_AGENT ua = uaString`;
    const result = columnsAfter(command, previousColumns);
    const names = result.map((c) => c.name);

    expect(names).not.toContain('ua.device.type');
  });

  it('includes device.type when extract_device_type is true', () => {
    const command = synth.cmd`USER_AGENT ua = uaString WITH { "extract_device_type": true }`;
    const result = columnsAfter(command, previousColumns);

    expect(result.slice(previousColumns.length)).toEqual([
      ...ALL_DEFAULT_COLUMNS,
      col('device.type'),
    ]);
  });

  it('includes device.type even when device is not in the properties list', () => {
    const command = synth.cmd`USER_AGENT ua = uaString WITH { "properties": ["name"], "extract_device_type": true }`;
    const result = columnsAfter(command, previousColumns);

    expect(result.slice(previousColumns.length)).toEqual([col('name'), col('device.type')]);
  });

  it('returns previous columns unchanged when targetField is absent', () => {
    // Construct a minimal command object without targetField
    const command = { type: 'command', name: 'user_agent', args: [] } as any;
    const result = columnsAfter(command, previousColumns);

    expect(result).toEqual(previousColumns);
  });
});
