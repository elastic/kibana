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

  it('groups STATS by the renamed column', () => {
    const root = parse('FROM index | RENAME bucket AS time_bucket | STATS total = COUNT(*)');
    trackColumnAndEnsureKept(root.commands, 'bucket', { ensureGrouped: true });
    expect(BasicPrettyPrinter.print(root)).toBe(
      'FROM index | RENAME bucket AS time_bucket | STATS total = COUNT(*) BY time_bucket'
    );
  });
});
