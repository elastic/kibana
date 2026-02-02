/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { synth } from '../../../..';
import { columnsAfter } from './columns_after';

describe('GROK > columnsAfter', () => {
  it('adds the GROK columns from the pattern in the list', () => {
    const previousCommandFields: ESQLFieldWithMetadata[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
    ];

    const result = columnsAfter(
      synth.cmd`GROK agent "%{WORD:firstWord}"`,
      previousCommandFields,
      ''
    );

    expect(result).toEqual([
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
      { name: 'firstWord', type: 'keyword', userDefined: false },
    ]);
  });

  it('adds the GROK columns from the pattern with the correct type', () => {
    const result = columnsAfter(synth.cmd`GROK agent "%{NUMBER:count:int}"`, [], '');

    expect(result).toEqual([{ name: 'count', type: 'integer', userDefined: false }]);
  });

  it('adds columns from multiple grok patterns', () => {
    const previousCommandFields: ESQLFieldWithMetadata[] = [
      { name: 'message', type: 'keyword', userDefined: false },
    ];

    const result = columnsAfter(
      synth.cmd`GROK message "%{IP:client_ip}", "%{WORD:method}", "%{NUMBER:status:int}"`,
      previousCommandFields,
      ''
    );

    expect(result).toEqual([
      { name: 'message', type: 'keyword', userDefined: false },
      { name: 'client_ip', type: 'keyword', userDefined: false },
      { name: 'method', type: 'keyword', userDefined: false },
      { name: 'status', type: 'integer', userDefined: false },
    ]);
  });

  it('merges columns from multiple patterns without duplicates', () => {
    const previousCommandFields: ESQLFieldWithMetadata[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
    ];

    // Same field extracted from multiple patterns
    const result = columnsAfter(
      synth.cmd`GROK message "%{IP:ip_address}", "%{IP:ip_address}"`,
      previousCommandFields,
      ''
    );

    expect(result).toEqual([
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'ip_address', type: 'keyword', userDefined: false },
    ]);
  });
});
