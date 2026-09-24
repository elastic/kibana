/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@elastic/esql';
import type { ESQLCommand } from '@elastic/esql/types';
import {
  buildTrendlineBucketExpression,
  buildTrendlineTbucketExpression,
  findFirstStatsAfterTs,
  findStatsWithTbucket,
  getTbucketResultColumn,
  getBucketResultColumnForField,
  getTimeGroupings,
} from './bucket';

const parseCommands = (esqlQuery: string): ESQLCommand[] => Parser.parse(esqlQuery).root.commands;

const parseStats = (esqlQuery: string): ESQLCommand => {
  const statsCommand = parseCommands(esqlQuery).find((command) => command.name === 'stats');
  if (!statsCommand) throw new Error('Expected STATS command in test query');
  return statsCommand;
};

describe('buildTrendlineBucketExpression', () => {
  it('builds a BUCKET expression with time params', () => {
    expect(buildTrendlineBucketExpression('@timestamp')).toBe(
      'BUCKET(@timestamp, 75, ?_tstart, ?_tend)'
    );
  });

  it('escapes dotted field names with backticks', () => {
    expect(buildTrendlineBucketExpression('order.date')).toBe(
      'BUCKET(`order.date`, 75, ?_tstart, ?_tend)'
    );
  });
});

describe('buildTrendlineTbucketExpression', () => {
  it('builds a TBUCKET expression with the auto bucket target', () => {
    expect(buildTrendlineTbucketExpression()).toBe('TBUCKET(75)');
  });
});

describe('findFirstStatsAfterTs', () => {
  it('returns the first STATS command after a TS source', () => {
    const commands = parseCommands('TS metrics-* | STATS avg_cpu = AVG(cpu) | STATS MAX(avg_cpu)');
    const statsCommand = findFirstStatsAfterTs(commands);
    expect(statsCommand).toBe(commands[1]);
  });

  it('returns undefined when the source is not TS', () => {
    expect(findFirstStatsAfterTs(parseCommands('FROM index | STATS AVG(cpu)'))).toBeUndefined();
  });

  it('returns undefined for a TS query without STATS', () => {
    expect(findFirstStatsAfterTs(parseCommands('TS metrics-* | LIMIT 10'))).toBeUndefined();
  });
});

describe('findStatsWithTbucket', () => {
  it('finds the STATS command grouped by TBUCKET', () => {
    const commands = parseCommands(
      'FROM index | STATS AVG(bytes) BY host | STATS MAX(`AVG(bytes)`) BY TBUCKET(100)'
    );
    expect(findStatsWithTbucket(commands)).toBe(commands[2]);
  });

  it('returns undefined when no STATS uses TBUCKET', () => {
    expect(
      findStatsWithTbucket(parseCommands('FROM index | STATS AVG(bytes) BY host'))
    ).toBeUndefined();
  });
});

describe('getTimeGroupings', () => {
  it('classifies unaliased BUCKET and TBUCKET groupings', () => {
    const statsCommand = parseStats(
      'FROM index | STATS COUNT(*) BY host, BUCKET(@timestamp, 1 hour), TBUCKET(100)'
    );
    expect(getTimeGroupings(statsCommand)).toEqual([
      { kind: 'bucket', field: '@timestamp', resultColumn: 'BUCKET(@timestamp, 1 hour)' },
      { kind: 'tbucket', field: undefined, resultColumn: 'TBUCKET(100)' },
    ]);
  });

  it('uses the alias as result column for assigned groupings', () => {
    const statsCommand = parseStats(
      'FROM index | STATS COUNT(*) BY b = BUCKET(@timestamp, 1 hour), t = TBUCKET(100)'
    );
    expect(getTimeGroupings(statsCommand)).toEqual([
      { kind: 'bucket', field: '@timestamp', resultColumn: 'b' },
      { kind: 'tbucket', field: undefined, resultColumn: 't' },
    ]);
  });

  it('ignores non-time groupings and returns empty for STATS without BY', () => {
    expect(getTimeGroupings(parseStats('FROM index | STATS COUNT(*) BY host'))).toEqual([]);
    expect(getTimeGroupings(parseStats('FROM index | STATS COUNT(*)'))).toEqual([]);
  });
});

describe('getTbucketResultColumn', () => {
  it('returns the printed expression for an unaliased TBUCKET', () => {
    const statsCommand = parseStats('TS metrics-* | STATS AVG(cpu) BY TBUCKET(100)');
    expect(getTbucketResultColumn(statsCommand)).toBe('TBUCKET(100)');
  });

  it('returns the alias for an assigned TBUCKET', () => {
    const statsCommand = parseStats('TS metrics-* | STATS AVG(cpu) BY bucket = TBUCKET(100)');
    expect(getTbucketResultColumn(statsCommand)).toBe('bucket');
  });

  it('returns undefined when the BY clause has no TBUCKET', () => {
    const statsCommand = parseStats('FROM index | STATS AVG(cpu) BY host');
    expect(getTbucketResultColumn(statsCommand)).toBeUndefined();
  });

  it('returns undefined for STATS without BY', () => {
    const statsCommand = parseStats('FROM index | STATS AVG(cpu)');
    expect(getTbucketResultColumn(statsCommand)).toBeUndefined();
  });
});

describe('getBucketResultColumnForField', () => {
  it('returns the printed expression for an unaliased BUCKET on the field', () => {
    const statsCommand = parseStats(
      'FROM index | STATS COUNT(*) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)'
    );
    expect(getBucketResultColumnForField(statsCommand, '@timestamp')).toBe(
      'BUCKET(@timestamp, 75, ?_tstart, ?_tend)'
    );
  });

  it('returns the alias for an assigned BUCKET on the field', () => {
    const statsCommand = parseStats(
      'FROM index | STATS COUNT(*) BY b = BUCKET(@timestamp, 1 hour)'
    );
    expect(getBucketResultColumnForField(statsCommand, '@timestamp')).toBe('b');
  });

  it('returns undefined when BUCKET targets a different field', () => {
    const statsCommand = parseStats('FROM index | STATS COUNT(*) BY BUCKET(other, 1 hour)');
    expect(getBucketResultColumnForField(statsCommand, '@timestamp')).toBeUndefined();
  });

  it('returns undefined for STATS without BY', () => {
    const statsCommand = parseStats('FROM index | STATS COUNT(*)');
    expect(getBucketResultColumnForField(statsCommand, '@timestamp')).toBeUndefined();
  });
});
