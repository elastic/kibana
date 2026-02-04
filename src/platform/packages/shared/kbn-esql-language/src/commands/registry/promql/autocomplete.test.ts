/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockContext, getMockCallbacks } from '../../../__tests__/commands/context_fixtures';
import { suggest } from '../../../__tests__/commands/autocomplete';
import { autocomplete } from './autocomplete';
import {
  assignCompletionItem,
  getPromqlParamKeySuggestions,
  pipeCompleteItem,
  promqlByCompleteItem,
} from '../complete_items';
import { getPromqlFunctionSuggestions } from '../../definitions/utils/promql';
import { ESQL_NUMBER_TYPES, ESQL_STRING_TYPES } from '../../definitions/types';
import { getPromqlParam, PROMQL_PARAM_NAMES } from './utils';
import type { ICommandCallbacks, ICommandContext } from '../types';
import { TIME_SYSTEM_PARAMS } from '../../definitions/utils/literals';
import { getFieldNamesByType } from '../../../__tests__/commands/autocomplete';

const promqlParamItems = getPromqlParamKeySuggestions();
const promqlParamTexts = promqlParamItems.map(({ text }) => text);
const promqlParamNames = PROMQL_PARAM_NAMES;
const promqlFunctionSuggestions = getPromqlFunctionSuggestions();
const promqlFunctionLabels = promqlFunctionSuggestions.map(({ label }) => label);
const promqlFunctionWrappedTexts = promqlFunctionSuggestions
  .slice(0, 1)
  .map(({ text }) => `(${text})`);
let mockCallbacks: ICommandCallbacks;

beforeEach(() => {
  jest.clearAllMocks();
  mockCallbacks = getMockCallbacks();
});

interface ExpectedSuggestions {
  textsContain?: string[];
  textsNotContain?: string[];
  labelsContain?: string[];
  labelsNotContain?: string[];
}

const expectPromqlSuggestions = async (
  query: string,
  expected: ExpectedSuggestions,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<void> => {
  const results = await suggest(
    query,
    context ?? mockContext,
    'promql',
    callbacks ?? getMockCallbacks(),
    autocomplete,
    cursorPosition
  );

  const texts = results.map(({ text }) => text);
  const labels = results.map(({ label }) => label);

  if (expected.textsContain?.length) {
    expect(texts).toEqual(expect.arrayContaining(expected.textsContain));
  }

  if (expected.textsNotContain?.length) {
    expect(texts).not.toEqual(expect.arrayContaining(expected.textsNotContain));
  }

  if (expected.labelsContain?.length) {
    expect(labels).toEqual(expect.arrayContaining(expected.labelsContain));
  }

  if (expected.labelsNotContain?.length) {
    expect(labels).not.toEqual(expect.arrayContaining(expected.labelsNotContain));
  }
};

describe('after PROMQL keyword', () => {
  test('suggests params but not column when required params missing', async () => {
    (mockCallbacks.getSuggestedUserDefinedColumnName as jest.Mock).mockReturnValue('col0');

    await expectPromqlSuggestions(
      'PROMQL ',
      {
        textsContain: promqlParamTexts,
        textsNotContain: ['col0 = '],
        labelsNotContain: promqlFunctionLabels,
      },
      mockCallbacks
    );
  });

  test('suggests column when all required params are present', async () => {
    (mockCallbacks.getSuggestedUserDefinedColumnName as jest.Mock).mockReturnValue('col0');

    await expectPromqlSuggestions(
      'PROMQL index=metrics step=5m start=?_tstart end=?_tend ',
      { textsContain: ['col0 = '], labelsContain: promqlFunctionLabels },
      mockCallbacks
    );
  });

  test('does not suggest column when cursor is before a param (editing middle of query)', async () => {
    (mockCallbacks.getSuggestedUserDefinedColumnName as jest.Mock).mockReturnValue('col0');
    const query = 'PROMQL index=metrics step=5m start=?_tstart end=?_tend rate(http_requests[5m])';
    const cursorPosition = 'PROMQL index=metrics '.length;

    await expectPromqlSuggestions(
      query,
      { textsNotContain: ['col0 = '] },
      mockCallbacks,
      undefined,
      cursorPosition
    );
  });

  test.each(['PROMQL index=metrics step=5m ', 'PROMQL index = metrics step = 5m '])(
    'does not suggest already-used params (%s)',
    async (query) => {
      await expectPromqlSuggestions(
        query,
        {
          labelsNotContain: ['index', 'step'],
          labelsContain: ['start', 'end'],
        },
        mockCallbacks
      );
    }
  );

  test('does not suggest any params when all are used', async () => {
    await expectPromqlSuggestions(
      'PROMQL index=metrics step=5m start=?_tstart end=?_tend ',
      { labelsNotContain: promqlParamNames },
      mockCallbacks
    );
  });

  test('does not suggest params already present after the cursor', async () => {
    const query = 'PROMQL index=metrics step=5m start=?_tstart end=?_tend ';
    const cursorPosition = 'PROMQL index=metrics '.length;

    await expectPromqlSuggestions(
      query,
      { labelsNotContain: ['step', 'start', 'end'] },
      mockCallbacks,
      undefined,
      cursorPosition
    );
  });

  test('handles quoted param values correctly', async () => {
    await expectPromqlSuggestions(
      'PROMQL index="metrics" step="5m" ',
      {
        labelsNotContain: ['index', 'step'],
        labelsContain: ['start', 'end'],
      },
      mockCallbacks
    );
  });

  test('does not treat query tokens starting with param names as used params', async () => {
    await expectPromqlSuggestions(
      'PROMQL start_time',
      { labelsContain: ['start'] },
      mockCallbacks,
      undefined,
      'PROMQL '.length
    );
  });
});

describe('param keyword suggestions', () => {
  test.each(promqlParamNames)('suggests = after %s keyword with space', async (param) => {
    await expectPromqlSuggestions(`PROMQL ${param} `, {
      textsContain: [assignCompletionItem.text],
    });
  });

  test('suggests = after param keyword when glued to quoted value', async () => {
    await expectPromqlSuggestions('PROMQL end="2026-01-13T11:30:00.000Z"start ', {
      textsContain: [assignCompletionItem.text],
    });
  });

  test.each(['PROMQL start="2024-01-01" step ', "PROMQL start='2024-01-01' step "])(
    'suggests = after param keyword even after quoted value (%s)',
    async (query) => {
      await expectPromqlSuggestions(query, {
        textsContain: [assignCompletionItem.text],
      });
    }
  );
});

describe('inside query', () => {
  test('returns no param suggestions inside query parentheses', async () => {
    await expectPromqlSuggestions('PROMQL index=metrics (rate(', {
      textsNotContain: promqlParamTexts,
    });
  });

  test('suggests promql functions inside query', async () => {
    await expectPromqlSuggestions('PROMQL (', {
      labelsContain: promqlFunctionLabels,
    });
  });

  test('ignores parentheses inside quoted strings', async () => {
    await expectPromqlSuggestions('PROMQL (metric{path="/api(v1)"}', {
      textsNotContain: promqlParamTexts,
    });
  });

  test('does not suggest params after label selector', async () => {
    await expectPromqlSuggestions('PROMQL (metric{job="api"} ', {
      textsNotContain: promqlParamTexts,
    });
  });

  test('detects inside_query when cursor is in middle of query', async () => {
    const query = 'PROMQL index=metrics (rate(http_requests[5m]))';

    await expectPromqlSuggestions(
      query,
      { textsNotContain: promqlParamTexts },
      mockCallbacks,
      undefined,
      query.indexOf('rate(') + 5
    );
  });

  test('suggests after comma inside function args', async () => {
    const scalarValueTexts = ['${0:0}'];
    const query = 'PROMQL index = kibana_sample_data_logstsdb step = "5m" round(bytes,  )';
    const cursorPosition = query.indexOf(',') + 2; // after comma + space

    await expectPromqlSuggestions(
      query,
      {
        textsContain: scalarValueTexts,
        labelsNotContain: ['pi', 'time', 'abs', 'rate'],
      },
      mockCallbacks,
      undefined,
      cursorPosition
    );
  });

  test('does not suggest after first arg without comma', async () => {
    const metricNames = getFieldNamesByType(ESQL_NUMBER_TYPES, true);

    await expectPromqlSuggestions('PROMQL round(bytes ', {
      labelsNotContain: [...promqlFunctionLabels, ...metricNames],
    });
  });

  test.each([
    ['label selector value', 'api'],
    ['label selector name', 'job'],
  ])('does not suggest function args when cursor is inside %s', async (_label, searchText) => {
    const metricNames = getFieldNamesByType(ESQL_NUMBER_TYPES, true);
    const query = 'PROMQL rate(http_requests_total{job="api"}[5m])';
    const cursorPosition = query.indexOf(searchText) + 1;

    await expectPromqlSuggestions(
      query,
      { labelsNotContain: [...promqlFunctionLabels, ...metricNames] },
      mockCallbacks,
      undefined,
      cursorPosition
    );
  });

  test('suggests numeric fields for rate()', async () => {
    const numericFields = getFieldNamesByType(ESQL_NUMBER_TYPES, true);
    const rangeSuffix = '[${0:5m}]';
    const numericTexts = numericFields.map((name) => `${name}${rangeSuffix}`);

    await expectPromqlSuggestions('PROMQL rate(', {
      labelsContain: numericFields,
      textsContain: numericTexts,
    });
  });

  test('suggests all number types without range selector for abs() (instant_vector)', async () => {
    const allNumericFields = getFieldNamesByType(ESQL_NUMBER_TYPES, true);

    await expectPromqlSuggestions('PROMQL abs(', {
      labelsContain: allNumericFields,
      textsNotContain: allNumericFields.map((name) => `${name}[\${0:5m}]`),
    });
  });

  test('excludes user-defined columns from field suggestions', async () => {
    await expectPromqlSuggestions('PROMQL sum( ', {
      labelsNotContain: ['var0', 'col0'],
    });
  });
});

describe('aggregation functions (by clause)', () => {
  test.each([
    'PROMQL sum(rate(http_requests_total[5m])) ',
    'PROMQL avg(rate(http_requests_total[5m])) ',
    'PROMQL index=metrics step=5m start=?_tstart end=?_tend sum(rate(http_requests_total[5m])) ',
  ])('suggests both by and pipe after complete aggregation (%s)', async (query) => {
    await expectPromqlSuggestions(query, {
      textsContain: [promqlByCompleteItem.text, pipeCompleteItem.text],
    });
  });

  test.each([
    'PROMQL sum(rate(http_requests_total[5m]))',
    'PROMQL avg(rate(http_requests_total[5m]))',
  ])('suggests only by when cursor is at end of aggregation without space (%s)', async (query) => {
    await expectPromqlSuggestions(query, {
      textsContain: [promqlByCompleteItem.text],
      textsNotContain: [pipeCompleteItem.text],
    });
  });

  test('suggests by for incomplete query with column assignment', async () => {
    const query =
      'PROMQL index=kibana_sample_data_logstsdb step=5m start="2026-01-06T15:30:00.000Z" end="2026-01-23T15:30:00.000Z" col= (sum(rate(bytes_counter[5m]))';

    await expectPromqlSuggestions(query, {
      textsContain: [promqlByCompleteItem.text],
    });
  });

  test('suggests functions and metrics inside incomplete aggregation function', async () => {
    const metricNames = getFieldNamesByType(ESQL_NUMBER_TYPES, true);

    await expectPromqlSuggestions('PROMQL sum( ', {
      labelsContain: ['abs', 'avg', ...metricNames],
      labelsNotContain: ['pi', 'time', promqlByCompleteItem.label],
    });
  });

  test('cursor inside complete empty function - sum(|) after accepting suggestion', async () => {
    const fullQuery = 'PROMQL sum()';
    const cursorBeforeClosingParen = 11; // index of )

    await expectPromqlSuggestions(
      fullQuery,
      {
        labelsNotContain: [...promqlFunctionLabels, promqlByCompleteItem.label],
      },
      mockCallbacks,
      undefined,
      cursorBeforeClosingParen
    );
  });

  test('cursor right after opening paren - sum(| without trailing space', async () => {
    await expectPromqlSuggestions('PROMQL sum(', {
      labelsNotContain: [...promqlFunctionLabels, promqlByCompleteItem.label],
    });
  });

  test('suggests labels inside by() grouping clause', async () => {
    const labelNames = getFieldNamesByType(ESQL_STRING_TYPES, true);

    await expectPromqlSuggestions('PROMQL sum(rate(http_requests[5m])) by (', {
      labelsContain: labelNames,
      labelsNotContain: ['sum', 'rate', 'avg'],
    });
  });

  test('does not suggest by after aggregation that already has grouping', async () => {
    await expectPromqlSuggestions('PROMQL sum(rate(http_requests[5m])) by (job) ', {
      textsNotContain: [promqlByCompleteItem.text],
      textsContain: [pipeCompleteItem.text],
    });
  });

  test('suggests by inside outer aggregation after trailing spaces', async () => {
    // cursor is after spaces but before closing paren of outer sum()
    // Should suggest 'by' for the completed inner avg() aggregation
    const query = 'PROMQL sum(avg(rate(bytes_counter))  )';
    const cursorPosition = query.lastIndexOf(')'); // cursor before the last )

    await expectPromqlSuggestions(
      query,
      { textsContain: [promqlByCompleteItem.text] },
      mockCallbacks,
      undefined,
      cursorPosition
    );
  });

  test('suggests by when cursor is in middle of trailing spaces', async () => {
    // Cursor is in the middle of spaces: sum(avg(bytes_counter)  |  )
    const query = 'PROMQL sum(avg(bytes_counter)    )';
    const cursorPosition = query.indexOf(')    )') + 3; // cursor after "sum(avg(bytes_counter)  "

    await expectPromqlSuggestions(
      query,
      { textsContain: [promqlByCompleteItem.text] },
      mockCallbacks,
      undefined,
      cursorPosition
    );
  });

  test('suggests by for completed inner aggregation in incomplete outer query', async () => {
    await expectPromqlSuggestions('PROMQL sum(avg(bytes)', {
      labelsContain: ['by'],
    });
  });

  test.each([
    ['simple rate()', 'PROMQL rate(bytes[5m]) ', undefined],
    [
      'nested rate() inside aggregation',
      'PROMQL sum(avg(rate(bytes_counter)   )  )',
      (query: string) => query.indexOf('bytes_counter)') + 'bytes_counter)'.length + 1,
    ],
    [
      'rate() inside col0 assignment with labels',
      'PROMQL step=5m start="2023-01-06" end="2026-01-23" col0 = (sum(avg(rate(bytes_counter{request="/elasticsearch"}[5m]) ) ) )',
      (query: string) => query.indexOf('[5m])') + '[5m])'.length + 1,
    ],
  ])('does not suggest by after rate() (%s)', async (_label, query, cursorSelector) => {
    const cursorPosition = cursorSelector ? cursorSelector(query) : undefined;

    await expectPromqlSuggestions(
      query,
      { labelsNotContain: ['by'] },
      mockCallbacks,
      undefined,
      cursorPosition
    );
  });

  test('does not suggest by at end of complete query with col0 = (...)', async () => {
    const query =
      'PROMQL step=5m start="2023-01-06" end="2026-01-23" col0 = (sum(avg(rate(bytes_counter{request="/elasticsearch"}[5m]) ) ) )';

    await expectPromqlSuggestions(query, {
      labelsNotContain: ['by'],
      textsContain: ['| '],
    });
  });
});

describe('after params (before query)', () => {
  test('suggests remaining params without column after index param (required params missing)', async () => {
    (mockCallbacks.getSuggestedUserDefinedColumnName as jest.Mock).mockReturnValue('col0');

    await expectPromqlSuggestions(
      'PROMQL index=metrics ',
      {
        textsContain: ['step = ', 'start = ', 'end = '],
        textsNotContain: ['index = ', 'col0 = '],
      },
      mockCallbacks
    );
  });

  test('suggests wrapped functions after custom column assignment', async () => {
    await expectPromqlSuggestions(
      'PROMQL step=5m start=?_tstart end=?_tend col0 = ',
      { textsContain: promqlFunctionWrappedTexts, labelsNotContain: promqlParamNames },
      mockCallbacks
    );
  });
});

describe('after query (pipe suggestions)', () => {
  test.each([
    'PROMQL index=metrics (sum by (instance) rate(http_requests_total[5m])) ',
    'PROMQL index=metrics sum by (instance) rate(http_requests_total[5m]) ',
  ])('suggests pipe after complete query with by clause (%s)', async (query) => {
    await expectPromqlSuggestions(query, {
      textsContain: [pipeCompleteItem.text],
    });
  });

  test.each([
    'PROMQL index=metrics (rate(http_requests[5m])) ',
    'PROMQL (rate(http_requests[5m])) ',
  ])('suggests pipe and no params after parenthesized query (%s)', async (query) => {
    await expectPromqlSuggestions(query, {
      textsContain: [pipeCompleteItem.text],
      labelsNotContain: promqlParamNames,
    });
  });

  test('does not suggest params after custom column assignment', async () => {
    await expectPromqlSuggestions('PROMQL index=metrics col0=(rate(http_requests[5m])) ', {
      textsContain: [pipeCompleteItem.text],
      labelsNotContain: [...promqlParamNames, ...promqlFunctionLabels],
    });
  });

  test.each(['PROMQL index=metrics rate(http_requests[5m]) ', 'PROMQL rate(http_requests[5m]) '])(
    'suggests pipe and no params after bare query (%s)',
    async (query) => {
      await expectPromqlSuggestions(query, {
        textsContain: [pipeCompleteItem.text],
        labelsNotContain: promqlParamNames,
      });
    }
  );

  test('does not suggest pipe after param that looks like query (step=5m)', async () => {
    await expectPromqlSuggestions('PROMQL index=metrics step=5m ', {
      textsNotContain: [pipeCompleteItem.text, 'index = ', 'step = '],
      textsContain: ['start = ', 'end = '],
    });
  });

  test('does not suggest pipe after multiple params (no query yet)', async () => {
    await expectPromqlSuggestions('PROMQL index=metrics step=5m start=?_tstart end=?_tend ', {
      textsNotContain: [pipeCompleteItem.text],
    });
  });
});

describe('param value suggestions', () => {
  test('suggests durations for step=', async () => {
    const stepValues = getPromqlParam('step')?.suggestedValues ?? [];

    await expectPromqlSuggestions('PROMQL step=', { textsContain: stepValues }, mockCallbacks);
  });

  test('does not suggest step values when value already present', async () => {
    const query = 'PROMQL step =   5m';
    const cursorPosition = query.indexOf('step =   ') + 'step =   '.length;
    const stepValues = getPromqlParam('step')?.suggestedValues ?? [];

    await expectPromqlSuggestions(
      query,
      { textsNotContain: stepValues },
      mockCallbacks,
      undefined,
      cursorPosition
    );
  });

  test('suggests date literals for start=', async () => {
    await expectPromqlSuggestions(
      'PROMQL start=',
      { textsContain: TIME_SYSTEM_PARAMS },
      mockCallbacks
    );
  });

  test('suggests date literals for end=', async () => {
    await expectPromqlSuggestions(
      'PROMQL end=',
      { textsContain: TIME_SYSTEM_PARAMS, labelsNotContain: promqlFunctionLabels },
      mockCallbacks
    );
  });

  test('suggests date literals when query follows end=', async () => {
    const query =
      'PROMQL index = kibana_sample_data_logstsdb step = 1h start = "2026-01-08T16:00:00.000Z" end =  bytes_counter';
    const cursorPosition = query.indexOf('end =  ') + 'end =  '.length;

    await expectPromqlSuggestions(
      query,
      { textsContain: TIME_SYSTEM_PARAMS },
      mockCallbacks,
      undefined,
      cursorPosition
    );
  });
});

describe('index= suggestions', () => {
  const contextWithSources: ICommandContext = {
    ...mockContext,
    timeSeriesSources: [
      { name: 'metrics', mode: 'time_series', aliases: [] },
      { name: 'logs-tsdb', mode: 'time_series', aliases: [] },
    ],
  };

  test.each([
    ['PROMQL index=', 'no space after equals'],
    ['PROMQL index= ', 'trailing space after equals'],
    ['PROMQL index = ', 'space before and after equals'],
  ])('suggests timeseries sources for %s (%s)', async (query) => {
    await expectPromqlSuggestions(
      query,
      { labelsContain: ['metrics'] },
      mockCallbacks,
      contextWithSources
    );
  });

  test('suggests comma and params after complete index name with space', async () => {
    await expectPromqlSuggestions(
      'PROMQL index=metrics ',
      { labelsContain: [',', 'step', 'start', 'end'] },
      mockCallbacks,
      contextWithSources
    );
  });

  test('suggests indices after comma', async () => {
    await expectPromqlSuggestions(
      'PROMQL index=metrics, ',
      { labelsContain: ['logs-tsdb'] },
      mockCallbacks,
      contextWithSources
    );
  });

  test('suggests indices when cursor is at index= with bare query after (no start/end)', async () => {
    const query = 'PROMQL step=5m index= avg(bytes_counter)';
    const cursorPosition = query.indexOf('index=') + 'index='.length;

    await expectPromqlSuggestions(
      query,
      { labelsContain: ['metrics'] },
      mockCallbacks,
      contextWithSources,
      cursorPosition
    );
  });
});
