/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { synth } from '@elastic/esql';
import { commandsMetadata } from '../../definitions/generated/commands/commands';
import { Commands } from '../../definitions/keywords';
import type { ElasticsearchCommandDefinition } from '../../definitions/types';
import type { ESQLColumnData } from '../types';
import { columnsAfter } from './columns_after';

describe('URI_PARTS > columnsAfter', () => {
  const previousColumns: ESQLColumnData[] = [
    { name: 'url', type: 'keyword', userDefined: false },
    { name: 'message', type: 'text', userDefined: false },
  ];
  const command = synth.cmd`URI_PARTS parts = url`;
  const commandOutput = (commandsMetadata[Commands.URI_PARTS] as ElasticsearchCommandDefinition)
    .output!.variants.all;

  it('adds prefixed columns from generated command output', () => {
    const result = columnsAfter(command, previousColumns);

    expect(result).toHaveLength(previousColumns.length + Object.keys(commandOutput).length);

    const newColumns = result.slice(previousColumns.length);
    expect(newColumns).toEqual(
      Object.entries(commandOutput).map(([suffix, { type }]) => ({
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
