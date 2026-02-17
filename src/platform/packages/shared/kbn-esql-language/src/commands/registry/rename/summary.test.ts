/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { synth } from '../../../..';
import { summary } from './summary';

describe('RENAME summary', () => {
  it('returns new columns and renamed pairs for AS syntax', () => {
    const command = synth.cmd`RENAME event.dataset AS col0`;
    const result = summary(command, '');

    expect(result.newColumns).toEqual(new Set(['col0']));
    expect(result.renamedColumnsPairs).toEqual(new Set([['col0', 'event.dataset']]));
  });

  it('returns new columns and renamed pairs for = syntax', () => {
    const command = synth.cmd`RENAME col0 = event.dataset`;
    const result = summary(command, '');

    expect(result.newColumns).toEqual(new Set(['col0']));
    expect(result.renamedColumnsPairs).toEqual(new Set([['col0', 'event.dataset']]));
  });

  it('handles multiple renames with mixed syntax', () => {
    const command = synth.cmd`RENAME col0 = event.dataset, message AS renamed_message`;
    const result = summary(command, '');

    expect(result.newColumns).toEqual(new Set(['col0', 'renamed_message']));
    expect(result.renamedColumnsPairs).toEqual(
      new Set([
        ['col0', 'event.dataset'],
        ['renamed_message', 'message'],
      ])
    );
  });

  it('handles multiple renames with AS syntax', () => {
    const command = synth.cmd`RENAME field1 AS new1, field2 AS new2`;
    const result = summary(command, '');

    expect(result.newColumns).toEqual(new Set(['new1', 'new2']));
    expect(result.renamedColumnsPairs).toEqual(
      new Set([
        ['new1', 'field1'],
        ['new2', 'field2'],
      ])
    );
  });

  it('handles multiple renames with = syntax', () => {
    const command = synth.cmd`RENAME new1 = field1, new2 = field2`;
    const result = summary(command, '');

    expect(result.newColumns).toEqual(new Set(['new1', 'new2']));
    expect(result.renamedColumnsPairs).toEqual(
      new Set([
        ['new1', 'field1'],
        ['new2', 'field2'],
      ])
    );
  });
});
