/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser, BasicPrettyPrinter } from '@elastic/esql';
import { resolveTrackedColumn, trackColumnAndEnsureKept } from './scope_walker';

const parse = (esqlQuery: string) => Parser.parse(esqlQuery).root;

describe('resolveTrackedColumn', () => {
  it('resolves the column name through the AS form', () => {
    const root = parse('FROM index | RENAME a AS b');
    expect(resolveTrackedColumn(root.commands, 'a').name).toBe('b');
  });

  it('resolves the column name through the assignment form', () => {
    const root = parse('FROM index | RENAME b = a');
    expect(resolveTrackedColumn(root.commands, 'a').name).toBe('b');
  });

  it('resolves chained renames', () => {
    const root = parse('FROM index | RENAME a AS b | RENAME b AS c');
    expect(resolveTrackedColumn(root.commands, 'a').name).toBe('c');
  });

  it('returns the original name when no rename applies', () => {
    const root = parse('FROM index | KEEP a');
    expect(resolveTrackedColumn(root.commands, 'a').name).toBe('a');
  });

  it('does not retain bucket identity after EVAL overwrites its only name', () => {
    const root = parse(
      'FROM kibana_sample_data_logs | STATS avg_bytes = AVG(bytes) BY b = BUCKET(@timestamp, 1 hour) | EVAL b = TO_STRING(b)'
    );
    const commandsAfterStats = root.commands.slice(2);

    expect(resolveTrackedColumn(commandsAfterStats, 'b').name).not.toBe('b');
  });

  it.each<
    [
      description: string,
      pipeline: string,
      resolvedName: string | undefined,
      resolvedAliases: string[]
    ]
  >([
    ['prefers a direct EVAL alias', 'EVAL time = bucket', 'time', ['bucket', 'time']],
    [
      'tracks chained aliases',
      'EVAL time = bucket | EVAL latest = time',
      'latest',
      ['bucket', 'time', 'latest'],
    ],
    [
      'tracks assignments left-to-right',
      'EVAL time = bucket, latest = time',
      'latest',
      ['bucket', 'time', 'latest'],
    ],
    [
      'preserves self-assignment',
      'EVAL time = bucket | EVAL bucket = bucket',
      'time',
      ['bucket', 'time'],
    ],
    ['ignores unrelated assignments', 'EVAL other = 1', 'bucket', ['bucket']],
    ['does not copy computed identities', 'EVAL time = TO_STRING(bucket)', 'bucket', ['bucket']],
    [
      'falls back after preferred alias overwrite',
      'EVAL time = bucket | EVAL time = 1',
      'bucket',
      ['bucket'],
    ],
    [
      'retains a copy after original overwrite',
      'EVAL time = bucket, bucket = TO_STRING(bucket)',
      'time',
      ['time'],
    ],
    [
      'does not copy an overwritten identity',
      'EVAL bucket = TO_STRING(bucket), time = bucket',
      undefined,
      [],
    ],
    ['retains only projected aliases', 'EVAL time = bucket | KEEP bucket', 'bucket', ['bucket']],
    ['invalidates an excluded identity', 'KEEP other', undefined, []],
    ['invalidates a dropped identity', 'DROP bucket', undefined, []],
    [
      'retains aliases through wildcard KEEP',
      'EVAL time = bucket | KEEP *',
      'time',
      ['bucket', 'time'],
    ],
    ['projects aliases through wildcard KEEP', 'EVAL time = bucket | KEEP time*', 'time', ['time']],
    [
      'projects aliases through wildcard DROP',
      'EVAL time = bucket | DROP time*',
      'bucket',
      ['bucket'],
    ],
    ['treats quoted wildcards literally', 'KEEP `*`', undefined, []],
    [
      'preserves alias preference through RENAME',
      'EVAL time = bucket | RENAME bucket AS original',
      'time',
      ['original', 'time'],
    ],
    [
      'invalidates an overwritten RENAME target',
      'EVAL time = bucket | RENAME other AS time',
      'bucket',
      ['bucket'],
    ],
    [
      'moves identity onto an existing alias',
      'EVAL time = bucket | RENAME bucket AS time',
      'time',
      ['time'],
    ],
    [
      'discards aliases not grouped by STATS',
      'EVAL time = bucket | STATS total = COUNT(*) BY bucket',
      'bucket',
      ['bucket'],
    ],
    [
      'resolves equivalent STATS output aliases',
      'EVAL time = bucket | STATS total = COUNT(*) BY latest = time',
      'latest',
      ['latest'],
    ],
    ['invalidates identity across ungrouped STATS', 'STATS total = COUNT(*)', undefined, []],
  ])('%s', (_description, pipeline, resolvedName, resolvedAliases) => {
    const root = parse(`FROM index | ${pipeline}`);

    expect(resolveTrackedColumn(root.commands, 'bucket')).toEqual({
      name: resolvedName,
      aliases: resolvedAliases,
    });
  });

  it('does not mutate KEEP commands', () => {
    const root = parse('FROM index | KEEP bytes');
    resolveTrackedColumn(root.commands, '@timestamp');
    expect(BasicPrettyPrinter.print(root)).toBe('FROM index | KEEP bytes');
  });
});

describe('trackColumnAndEnsureKept', () => {
  it('appends a missing column to KEEP commands', () => {
    const root = parse('FROM index | KEEP bytes');
    trackColumnAndEnsureKept(root.commands, '@timestamp');
    expect(BasicPrettyPrinter.print(root)).toBe('FROM index | KEEP bytes, @timestamp');
  });

  it('does not duplicate a column already present in KEEP', () => {
    const root = parse('FROM index | KEEP bytes, @timestamp');
    trackColumnAndEnsureKept(root.commands, '@timestamp');
    expect(BasicPrettyPrinter.print(root)).toBe('FROM index | KEEP bytes, @timestamp');
  });

  it('tracks the column through RENAME before a KEEP', () => {
    const root = parse('FROM index | RENAME @timestamp AS time | KEEP bytes');
    trackColumnAndEnsureKept(root.commands, '@timestamp');
    expect(BasicPrettyPrinter.print(root)).toBe(
      'FROM index | RENAME @timestamp AS time | KEEP bytes, time'
    );
  });

  it('removes the tracked column from DROP commands', () => {
    const root = parse('FROM index | DROP bytes, time_bucket');
    trackColumnAndEnsureKept(root.commands, 'time_bucket');
    expect(BasicPrettyPrinter.print(root)).toBe('FROM index | DROP bytes');
  });

  it('removes a DROP command when it only drops the tracked column', () => {
    const root = parse('FROM index | DROP time_bucket | STATS total = COUNT(*)');
    trackColumnAndEnsureKept(root.commands, 'time_bucket', { ensureGrouped: true });
    expect(BasicPrettyPrinter.print(root)).toBe(
      'FROM index | STATS total = COUNT(*) BY time_bucket'
    );
  });

  it('adds a BY clause to STATS when grouping is required', () => {
    const root = parse('FROM index | STATS total = COUNT(*)');
    trackColumnAndEnsureKept(root.commands, 'time_bucket', { ensureGrouped: true });
    expect(BasicPrettyPrinter.print(root)).toBe(
      'FROM index | STATS total = COUNT(*) BY time_bucket'
    );
  });

  it('extends an existing STATS BY clause when grouping is required', () => {
    const root = parse('FROM index | STATS total = COUNT(*) BY host');
    trackColumnAndEnsureKept(root.commands, 'time_bucket', { ensureGrouped: true });
    expect(BasicPrettyPrinter.print(root)).toBe(
      'FROM index | STATS total = COUNT(*) BY host, time_bucket'
    );
  });

  it('does not duplicate an existing STATS grouping', () => {
    const root = parse('FROM index | STATS total = COUNT(*) BY time_bucket');
    trackColumnAndEnsureKept(root.commands, 'time_bucket', { ensureGrouped: true });
    expect(BasicPrettyPrinter.print(root)).toBe(
      'FROM index | STATS total = COUNT(*) BY time_bucket'
    );
  });

  it('tracks an existing aliased STATS grouping without duplicating it', () => {
    const root = parse('FROM index | STATS total = COUNT(*) BY time_bucket = bucket');
    const state = trackColumnAndEnsureKept(root.commands, 'bucket', { ensureGrouped: true });
    expect(BasicPrettyPrinter.print(root)).toBe(
      'FROM index | STATS total = COUNT(*) BY time_bucket = bucket'
    );
    expect(state.name).toBe('time_bucket');
  });

  it.each([
    ['EVAL time = bucket | KEEP other', 'EVAL time = bucket | KEEP other, time', 'time'],
    ['EVAL time = bucket | KEEP bucket', 'EVAL time = bucket | KEEP bucket', 'bucket'],
    ['EVAL time = bucket | DROP time', 'EVAL time = bucket | DROP time', 'bucket'],
    ['EVAL time = bucket | DROP bucket, time', 'EVAL time = bucket | DROP bucket', 'time'],
    ['EVAL time = bucket | KEEP *', 'EVAL time = bucket | KEEP *', 'time'],
    ['EVAL time = bucket | DROP *', 'EVAL time = bucket', 'time'],
    [
      'EVAL time = bucket | STATS total = COUNT(*)',
      'EVAL time = bucket | STATS total = COUNT(*) BY time',
      'time',
    ],
    [
      'EVAL time = bucket | STATS total = COUNT(*) BY bucket | KEEP total',
      'EVAL time = bucket | STATS total = COUNT(*) BY bucket | KEEP total, bucket',
      'bucket',
    ],
    [
      'EVAL time = bucket | STATS total = COUNT(*) BY latest = time | KEEP total',
      'EVAL time = bucket | STATS total = COUNT(*) BY latest = time | KEEP total, latest',
      'latest',
    ],
  ])('preserves identity through %s', (pipeline, expectedPipeline, name) => {
    const root = parse(`FROM index | ${pipeline}`);
    const state = trackColumnAndEnsureKept(root.commands, 'bucket', { ensureGrouped: true });

    expect(BasicPrettyPrinter.print(root)).toBe(`FROM index | ${expectedPipeline}`);
    expect(state.name).toBe(name);
  });

  it('rejects an overwritten identity instead of reintroducing it through KEEP or STATS', () => {
    const root = parse(
      'FROM index | EVAL bucket = TO_STRING(bucket) | KEEP other | STATS total = COUNT(*)'
    );

    expect(() =>
      trackColumnAndEnsureKept(root.commands, 'bucket', { ensureGrouped: true })
    ).toThrow('Cannot build trendline: time column [bucket] is no longer available');
    expect(BasicPrettyPrinter.print(root)).toBe(
      'FROM index | EVAL bucket = TO_STRING(bucket) | KEEP other | STATS total = COUNT(*)'
    );
  });

  it('groups STATS by the renamed column', () => {
    const root = parse('FROM index | RENAME bucket AS time_bucket | STATS total = COUNT(*)');
    trackColumnAndEnsureKept(root.commands, 'bucket', { ensureGrouped: true });
    expect(BasicPrettyPrinter.print(root)).toBe(
      'FROM index | RENAME bucket AS time_bucket | STATS total = COUNT(*) BY time_bucket'
    );
  });
});
