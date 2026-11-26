/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { SOURCES_TYPES } from '@kbn/esql-types';
import { FunctionDefinitionTypes } from '../../../commands/definitions/types';
import { Location, type ISuggestionItem } from '../../../commands/registry/types';
import { ESQL_APPLY_TEXT_REPLACEMENT_COMMAND } from '../../../commands/registry/constants';
import { setTestFunctions } from '../../../commands/definitions/utils/test_functions';
import { setup } from './helpers';

const TS_INCOMPATIBLE_FN = {
  type: FunctionDefinitionTypes.AGG,
  name: 'TS_INCOMPATIBLE_AGG',
  description: 'An aggregation that is not supported in TS pipelines',
  signatures: [{ params: [], returnType: 'double' as const }],
  locationsAvailable: [Location.STATS],
  tsdbCompatible: false,
};

const TS_COMPATIBLE_FN = {
  type: FunctionDefinitionTypes.AGG,
  name: 'TS_COMPATIBLE_AGG',
  description: 'An aggregation that is supported everywhere',
  signatures: [{ params: [], returnType: 'double' as const }],
  locationsAvailable: [Location.STATS],
};

describe('tsdbCompatible filtering', () => {
  beforeEach(() => setTestFunctions([TS_INCOMPATIBLE_FN, TS_COMPATIBLE_FN]));
  afterEach(() => setTestFunctions([]));

  it('excludes tsdbCompatible:false functions from suggestions in a TS pipeline', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('TS index | STATS /')).map((s) => s.label);

    expect(suggestions).not.toContain('TS_INCOMPATIBLE_AGG');
    expect(suggestions).toContain('TS_COMPATIBLE_AGG');
  });

  it('includes tsdbCompatible:false functions in suggestions in a FROM pipeline', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('FROM index | STATS /')).map((s) => s.label);

    expect(suggestions).toContain('TS_INCOMPATIBLE_AGG');
    expect(suggestions).toContain('TS_COMPATIBLE_AGG');
  });
});

describe('time series source context', () => {
  it.each([
    'FROM (TS index | STATS AVG(/))',
    'FROM index | WHERE 6.9 IN (TS index | STATS AVG(/))',
  ])('suggests time series aggregations inside a TS subquery: %s', async (query) => {
    const { suggest } = await setup();
    const suggestions = (await suggest(query)).map((s) => s.label);

    expect(suggestions).toContain('AVG_OVER_TIME');
  });

  it('does not suggest time series aggregations inside a non-TS subquery of a TS query', async () => {
    const { suggest } = await setup();
    const suggestions = (await suggest('TS index | WHERE 6.9 IN (FROM index | STATS AVG(/))')).map(
      (s) => s.label
    );

    expect(suggestions).not.toContain('AVG_OVER_TIME');
  });
});

describe('time series sources in subqueries', () => {
  const suggestTsdbIndex = async (query: string) => {
    const { suggest, callbacks } = await setup();
    const suggestions = await suggest(query, {
      callbacks: {
        ...callbacks,
        getSources: jest.fn(async () => [
          { name: 'index', hidden: false, type: SOURCES_TYPES.INDEX },
          { name: 'tsdb_index', hidden: false, type: SOURCES_TYPES.TIMESERIES },
        ]),
      },
    });

    return suggestions.find(({ label }) => label === 'tsdb_index');
  };

  const getTextReplacement = (suggestion?: ISuggestionItem) => {
    const commands: Array<{ id: string; arguments?: Array<Record<string, string>> }> = JSON.parse(
      suggestion?.command?.arguments?.[0]?.commands ?? '[]'
    );

    return commands.find(({ id }) => id === ESQL_APPLY_TEXT_REPLACEMENT_COMMAND)?.arguments?.[0];
  };

  it.each(['FROM index, (FROM /)', 'FROM index, (FROM tsdb_i/)'])(
    'rewrites only the subquery FROM to TS: %s',
    async (query) => {
      expect(getTextReplacement(await suggestTsdbIndex(query))).toEqual({
        replacementText: 'TS tsdb_index',
        replaceStart: String('FROM index, ('.length),
        replaceEnd: String('FROM index, (FROM tsdb_index'.length),
      });
    }
  );

  it('keeps FROM when the subquery has another source', async () => {
    const suggestion = await suggestTsdbIndex('FROM index, (FROM (ROW x = 1), tsdb_i/)');

    expect(suggestion).toBeDefined();
    expect(getTextReplacement(suggestion)).toBeUndefined();
  });
});
