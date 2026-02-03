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
} from '../complete_items';
import { getPromqlParam, PROMQL_PARAM_NAMES } from './utils';
import type { ICommandCallbacks, ICommandContext } from '../types';
import { TIME_SYSTEM_PARAMS } from '../../definitions/utils/literals';

const promqlParamItems = getPromqlParamKeySuggestions();
const promqlParamTexts = promqlParamItems.map(({ text }) => text);
const promqlParamNames = PROMQL_PARAM_NAMES;
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
      { textsContain: promqlParamTexts, textsNotContain: ['col0 = '] },
      mockCallbacks
    );
  });

  test('suggests column when all required params are present', async () => {
    (mockCallbacks.getSuggestedUserDefinedColumnName as jest.Mock).mockReturnValue('col0');

    await expectPromqlSuggestions(
      'PROMQL index=metrics step=5m start=?_tstart end=?_tend ',
      { textsContain: ['col0 = '] },
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
});

describe('after query (pipe suggestions)', () => {
  test.each([
    'PROMQL index=metrics (sum by (instance) rate(http_requests_total[5m])) ',
    'PROMQL index=metrics sum by (instance) rate(http_requests_total[5m]) ',
    'PROMQL index=metrics (rate(http_requests_total[5m])) ',
    'PROMQL rate(http_requests_total[5m]) ',
    'PROMQL index=metrics col0=(rate(http_requests_total[5m])) ',
  ])('suggests pipe after complete query (%s)', async (query) => {
    await expectPromqlSuggestions(query, {
      textsContain: [pipeCompleteItem.text],
    });
  });

  test('suggests pipe and no params after parenthesized query', async () => {
    await expectPromqlSuggestions('PROMQL index=metrics (rate(http_requests[5m])) ', {
      textsContain: [pipeCompleteItem.text],
      labelsNotContain: promqlParamNames,
    });
  });

  test('does not suggest params after custom column assignment', async () => {
    await expectPromqlSuggestions('PROMQL index=metrics col0=(rate(http_requests[5m])) ', {
      textsContain: [pipeCompleteItem.text],
      labelsNotContain: promqlParamNames,
    });
  });

  test('does not suggest params after parenthesized query without params', async () => {
    await expectPromqlSuggestions('PROMQL (rate(http_requests[5m])) ', {
      textsContain: [pipeCompleteItem.text],
      labelsNotContain: promqlParamNames,
    });
  });

  test('suggests pipe and no params after bare query', async () => {
    await expectPromqlSuggestions('PROMQL index=metrics rate(http_requests[5m]) ', {
      textsContain: [pipeCompleteItem.text],
      labelsNotContain: promqlParamNames,
    });
  });

  test('suggests pipe after simple query without params', async () => {
    await expectPromqlSuggestions('PROMQL rate(http_requests[5m]) ', {
      textsContain: [pipeCompleteItem.text],
    });
  });

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
      { textsContain: TIME_SYSTEM_PARAMS },
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
});
