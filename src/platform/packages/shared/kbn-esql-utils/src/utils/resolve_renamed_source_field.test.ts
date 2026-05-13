/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveRenamedSourceField } from './resolve_renamed_source_field';

describe('resolveRenamedSourceField', () => {
  describe('when the query has no RENAME', () => {
    it('returns the same name when the query has no RENAME', () => {
      const query = 'FROM logs | LIMIT 10';
      expect(resolveRenamedSourceField('host', query)).toBe('host');
    });
  });

  describe('RENAME chains and ordering', () => {
    it('resolves a single RENAME pair', () => {
      const query = 'FROM index | RENAME old_name AS new_name';
      expect(resolveRenamedSourceField('new_name', query)).toBe('old_name');
    });

    it('composes sequential RENAME commands (oldest-first in pipeline)', () => {
      const query = 'FROM index | RENAME old_name AS new_name_1 | RENAME new_name_1 AS new_name_2';
      expect(resolveRenamedSourceField('new_name_2', query)).toBe('old_name');
    });

    it('leaves a name unchanged when it is not the new side of any RENAME', () => {
      const query = 'FROM index | RENAME b AS a';
      expect(resolveRenamedSourceField('b', query)).toBe('b');
      expect(resolveRenamedSourceField('other', query)).toBe('other');
    });

    it('stabilizes on alternating RENAME of the same identifiers', () => {
      const query = 'FROM index | RENAME a AS b | RENAME b AS a';
      expect(resolveRenamedSourceField('a', query)).toBe('a');
    });

    it('unwinds through the junction when RENAME order is pipeline (chronological) order', () => {
      const query = 'FROM index | RENAME host AS agent | RENAME agent AS user_agent';
      expect(resolveRenamedSourceField('user_agent', query)).toBe('host');
      expect(resolveRenamedSourceField('agent', query)).toBe('host');
    });

    it('applies the most recent RENAME first so later reuse of a name does not chain incorrectly', () => {
      const query =
        'FROM kibana_sample_data_logs | RENAME agent AS user_agent | RENAME host AS agent';
      expect(resolveRenamedSourceField('user_agent', query)).toBe('agent');
      expect(resolveRenamedSourceField('agent', query)).toBe('host');
    });

    it('unwinds RENAME when the source field is dotted (quoted in RENAME)', () => {
      const query = 'FROM kibana_sample_data_logs | RENAME `agent.keyword` AS agent_kw';
      expect(resolveRenamedSourceField('agent_kw', query)).toBe('agent.keyword');
    });
  });

  describe('EVAL and synthetic columns', () => {
    it('does not unwind through EVAL output that only appears as the old side of RENAME', () => {
      const query =
        'FROM kibana_sample_data_logs | EVAL message = CONCAT(host, ":", geo.dest) | RENAME message AS context';
      expect(resolveRenamedSourceField('context', query)).toBe('context');
    });

    it('does not unwind RENAME through a prior EVAL column (get_query_summary pipeline)', () => {
      const query = 'FROM index | EVAL computed = price * 2 | RENAME computed AS total';
      expect(resolveRenamedSourceField('total', query)).toBe('total');
    });
  });

  describe('STATS BY aliases and TBUCKET', () => {
    it('unwinds STATS ... BY newName = agent.keyword to the dotted source field', () => {
      const query =
        'FROM kibana_sample_data_logs | STATS count = COUNT(*) BY `Over time` = TBUCKET(50), newName = agent.keyword';
      expect(resolveRenamedSourceField('newName', query)).toBe('agent.keyword');
    });

    it('does not treat TBUCKET assignment as a STATS column rename for the time alias', () => {
      const query =
        'FROM kibana_sample_data_logs | STATS count = COUNT(*) BY `Over time` = TBUCKET(50), newName = agent.keyword';
      expect(resolveRenamedSourceField('Over time', query)).toBe('Over time');
    });

    it('matches lens-style STATS with bare dotted BY column and TBUCKET', () => {
      const query =
        'FROM kibana_sample_data_logs | STATS count = COUNT(*) BY `Over time` = TBUCKET(50), agent.keyword';
      expect(resolveRenamedSourceField('agent.keyword', query)).toBe('agent.keyword');
      expect(resolveRenamedSourceField('count', query)).toBe('count');
    });

    it('chains STATS BY dotted alias with a following RENAME', () => {
      const query =
        'FROM kibana_sample_data_logs | STATS count = COUNT(*) BY `Over time` = TBUCKET(50), newName = agent.keyword | RENAME newName AS ua';
      expect(resolveRenamedSourceField('ua', query)).toBe('agent.keyword');
    });

    it('chains STATS BY dotted alias with multiple RENAME steps', () => {
      const query =
        'FROM kibana_sample_data_logs | STATS count = COUNT(*) BY newName = agent.keyword | RENAME newName AS n2 | RENAME n2 AS n3';
      expect(resolveRenamedSourceField('n3', query)).toBe('agent.keyword');
    });

    it('unwinds RENAME of a STATS expression column to the expression text', () => {
      const query =
        'FROM kibana_sample_data_logs | STATS COUNT() BY categorize(message) | RENAME `CATEGORIZE(message)` AS pattern';
      expect(resolveRenamedSourceField('pattern', query)).toBe('CATEGORIZE(message)');
    });

    it('does not unwind through STATS categorize alias (not a simple column rename in summary)', () => {
      const query =
        'FROM kibana_sample_data_logs | STATS COUNT() BY pattern = categorize(message) | RENAME pattern AS meow';
      expect(resolveRenamedSourceField('meow', query)).toBe('meow');
    });
  });

  describe('invalidation after RENAME (DROP / EVAL shadowing)', () => {
    it('returns output column name when RENAME output is dropped then redefined by EVAL', () => {
      const query =
        'FROM kibana_sample_data_logs | RENAME agent.keyword AS x | DROP x | EVAL x = "literal"';
      expect(resolveRenamedSourceField('x', query)).toBe('x');
    });

    it('returns output column name when RENAME output is shadowed by EVAL with same name', () => {
      const query =
        'FROM kibana_sample_data_logs | RENAME agent.keyword AS x | EVAL x = CONCAT(x, "_suffix")';
      expect(resolveRenamedSourceField('x', query)).toBe('x');
    });
  });

  it('', () => {
    const query = `
    FROM kibana_sample_data_logs
      | EVAL request_summary = CONCAT(host, " - ", request)
      | RENAME request_summary AS message
      | KEEP host, message, bytes, @timestamp
    `;
    expect(resolveRenamedSourceField('message', query)).toBe('message');
  });
});
