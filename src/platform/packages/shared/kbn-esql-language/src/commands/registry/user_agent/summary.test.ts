/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { synth } from '@elastic/esql';
import { summary } from './summary';

describe('USER_AGENT > summary', () => {
  it('returns all default columns when no options are provided', () => {
    const result = summary(synth.cmd`USER_AGENT ua = uaString`);
    expect(result).toEqual({
      newColumns: new Set([
        'ua.name',
        'ua.version',
        'ua.os.name',
        'ua.os.version',
        'ua.os.full',
        'ua.device.name',
      ]),
    });
  });

  it('returns only columns for the selected properties', () => {
    const result = summary(
      synth.cmd`USER_AGENT ua = uaString WITH { "properties": ["name", "os"] }`
    );
    expect(result).toEqual({
      newColumns: new Set(['ua.name', 'ua.os.name', 'ua.os.version', 'ua.os.full']),
    });
  });

  it('includes device.type when extract_device_type is true', () => {
    const result = summary(
      synth.cmd`USER_AGENT ua = uaString WITH { "extract_device_type": true }`
    );
    expect(result.newColumns).toContain('ua.device.type');
  });

  it('does not include device.type by default', () => {
    const result = summary(synth.cmd`USER_AGENT ua = uaString`);
    expect(result.newColumns).not.toContain('ua.device.type');
  });

  it('includes device.type even when device is not in properties', () => {
    const result = summary(
      synth.cmd`USER_AGENT ua = uaString WITH { "properties": ["name"], "extract_device_type": true }`
    );
    expect(result).toEqual({
      newColumns: new Set(['ua.name', 'ua.device.type']),
    });
  });

  it('returns empty set when targetField is absent', () => {
    const command = { type: 'command', name: 'user_agent', args: [] } as any;
    const result = summary(command);
    expect(result).toEqual({ newColumns: new Set() });
  });
});
