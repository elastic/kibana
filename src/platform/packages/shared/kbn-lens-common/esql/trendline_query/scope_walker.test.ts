/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser, BasicPrettyPrinter } from '@elastic/esql';
import { walkTrackedColumn } from './scope_walker';

const parse = (esqlQuery: string) => Parser.parse(esqlQuery).root;

describe('walkTrackedColumn', () => {
  describe('rename tracking', () => {
    it('resolves the column name through the AS form', () => {
      const root = parse('FROM index | RENAME a AS b');
      expect(walkTrackedColumn(root.commands, 'a').name).toBe('b');
    });

    it('resolves the column name through the assignment form', () => {
      const root = parse('FROM index | RENAME b = a');
      expect(walkTrackedColumn(root.commands, 'a').name).toBe('b');
    });

    it('resolves chained renames', () => {
      const root = parse('FROM index | RENAME a AS b | RENAME b AS c');
      expect(walkTrackedColumn(root.commands, 'a').name).toBe('c');
    });

    it('returns the original name when no rename applies', () => {
      const root = parse('FROM index | KEEP a');
      expect(walkTrackedColumn(root.commands, 'a').name).toBe('a');
    });
  });

  describe('ensureKept', () => {
    it('appends a missing column to KEEP commands', () => {
      const root = parse('FROM index | KEEP bytes');
      walkTrackedColumn(root.commands, '@timestamp', { ensureKept: true });
      expect(BasicPrettyPrinter.print(root)).toBe('FROM index | KEEP bytes, @timestamp');
    });

    it('does not duplicate a column already present in KEEP', () => {
      const root = parse('FROM index | KEEP bytes, @timestamp');
      walkTrackedColumn(root.commands, '@timestamp', { ensureKept: true });
      expect(BasicPrettyPrinter.print(root)).toBe('FROM index | KEEP bytes, @timestamp');
    });

    it('tracks the column through RENAME before a KEEP', () => {
      const root = parse('FROM index | RENAME @timestamp AS time | KEEP bytes');
      walkTrackedColumn(root.commands, '@timestamp', { ensureKept: true });
      expect(BasicPrettyPrinter.print(root)).toBe(
        'FROM index | RENAME @timestamp AS time | KEEP bytes, time'
      );
    });

    it('does not mutate KEEP commands without ensureKept', () => {
      const root = parse('FROM index | KEEP bytes');
      walkTrackedColumn(root.commands, '@timestamp');
      expect(BasicPrettyPrinter.print(root)).toBe('FROM index | KEEP bytes');
    });
  });
});
