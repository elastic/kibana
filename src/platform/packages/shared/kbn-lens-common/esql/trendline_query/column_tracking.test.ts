/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser, BasicPrettyPrinter } from '@elastic/esql';
import { preserveColumnInKeepCommands, applyRenamesToColumn } from './column_tracking';

const parseCommands = (esqlQuery: string) => Parser.parse(esqlQuery).root;

describe('preserveColumnInKeepCommands', () => {
  it('appends a missing column to KEEP commands', () => {
    const root = parseCommands('FROM index | KEEP bytes');
    preserveColumnInKeepCommands(root.commands, '@timestamp');
    expect(BasicPrettyPrinter.print(root)).toBe('FROM index | KEEP bytes, @timestamp');
  });

  it('does not duplicate a column already present in KEEP', () => {
    const root = parseCommands('FROM index | KEEP bytes, @timestamp');
    preserveColumnInKeepCommands(root.commands, '@timestamp');
    expect(BasicPrettyPrinter.print(root)).toBe('FROM index | KEEP bytes, @timestamp');
  });

  it('tracks the column through RENAME before a KEEP', () => {
    const root = parseCommands('FROM index | RENAME @timestamp AS time | KEEP bytes');
    preserveColumnInKeepCommands(root.commands, '@timestamp');
    expect(BasicPrettyPrinter.print(root)).toBe(
      'FROM index | RENAME @timestamp AS time | KEEP bytes, time'
    );
  });
});

describe('applyRenamesToColumn', () => {
  it('resolves the column name through the AS form', () => {
    const root = parseCommands('FROM index | RENAME a AS b');
    expect(applyRenamesToColumn(root.commands, 'a')).toBe('b');
  });

  it('resolves the column name through the assignment form', () => {
    const root = parseCommands('FROM index | RENAME b = a');
    expect(applyRenamesToColumn(root.commands, 'a')).toBe('b');
  });

  it('resolves chained renames', () => {
    const root = parseCommands('FROM index | RENAME a AS b | RENAME b AS c');
    expect(applyRenamesToColumn(root.commands, 'a')).toBe('c');
  });

  it('returns the original name when no rename applies', () => {
    const root = parseCommands('FROM index | KEEP a');
    expect(applyRenamesToColumn(root.commands, 'a')).toBe('a');
  });
});
