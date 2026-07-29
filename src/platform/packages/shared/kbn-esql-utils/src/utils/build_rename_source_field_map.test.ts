/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildRenameSourceFieldMap } from './build_rename_source_field_map';

const resolve = (name: string, query: string) => buildRenameSourceFieldMap(query).get(name) ?? name;

describe('buildRenameSourceFieldMap', () => {
  describe('when the query has no RENAME', () => {
    it('returns the same name when the query has no RENAME', () => {
      const query = 'FROM logs | LIMIT 10';
      expect(resolve('host', query)).toBe('host');
    });
  });

  describe('RENAME chains and ordering', () => {
    it('resolves a single RENAME pair', () => {
      const query = 'FROM index | RENAME old_name AS new_name';
      expect(resolve('new_name', query)).toBe('old_name');
    });

    it('composes sequential RENAME commands (oldest-first in pipeline)', () => {
      const query = 'FROM index | RENAME old_name AS new_name_1 | RENAME new_name_1 AS new_name_2';
      expect(resolve('new_name_2', query)).toBe('old_name');
    });

    it('leaves a name unchanged when it is not the new side of any RENAME', () => {
      const query = 'FROM index | RENAME b AS a';
      expect(resolve('b', query)).toBe('b');
      expect(resolve('other', query)).toBe('other');
    });

    it('stabilizes on alternating RENAME of the same identifiers', () => {
      const query = 'FROM index | RENAME a AS b | RENAME b AS a';
      expect(resolve('a', query)).toBe('a');
    });

    it('unwinds through the junction when RENAME order is pipeline (chronological) order', () => {
      const query = 'FROM index | RENAME host AS agent | RENAME agent AS user_agent';
      expect(resolve('user_agent', query)).toBe('host');
      expect(resolve('agent', query)).toBe('host');
    });

    it('applies the most recent RENAME first so later reuse of a name does not chain incorrectly', () => {
      const query =
        'FROM kibana_sample_data_logs | RENAME agent AS user_agent | RENAME host AS agent';
      expect(resolve('user_agent', query)).toBe('agent');
      expect(resolve('agent', query)).toBe('host');
    });

    it('unwinds RENAME when the source field is dotted (quoted in RENAME)', () => {
      const query = 'FROM kibana_sample_data_logs | RENAME `agent.keyword` AS agent_kw';
      expect(resolve('agent_kw', query)).toBe('agent.keyword');
    });
  });

  describe('EVAL and synthetic columns', () => {
    it('does not unwind through EVAL output that only appears as the old side of RENAME', () => {
      const query =
        'FROM kibana_sample_data_logs | EVAL message = CONCAT(host, ":", geo.dest) | RENAME message AS context';
      expect(resolve('context', query)).toBe('context');
    });

    it('does not unwind RENAME through a prior EVAL column (get_query_summary pipeline)', () => {
      const query = 'FROM index | EVAL computed = price * 2 | RENAME computed AS total';
      expect(resolve('total', query)).toBe('total');
    });

    it('resolves EVAL new = old as a rename to the source field', () => {
      const query = 'FROM kibana_sample_data_logs | EVAL file_size = bytes';
      expect(resolve('file_size', query)).toBe('bytes');
    });

    it('resolves EVAL new = old | DROP old as a rename to the source field', () => {
      const query = 'FROM kibana_sample_data_logs | EVAL file_size = bytes | DROP bytes';
      expect(resolve('file_size', query)).toBe('bytes');
    });

    it('does not resolve EVAL new = func(...) as a rename', () => {
      const query = 'FROM kibana_sample_data_logs | EVAL file_size = ABS(bytes)';
      expect(resolve('file_size', query)).toBe('file_size');
    });

    it('does not resolve EVAL new = old when new is subsequently shadowed by EVAL', () => {
      const query =
        'FROM kibana_sample_data_logs | EVAL file_size = bytes | EVAL file_size = file_size * 2';
      expect(resolve('file_size', query)).toBe('file_size');
    });

    it('resolves multiple EVAL renames independently', () => {
      const query = 'FROM kibana_sample_data_logs | EVAL client_ip = clientip, os = machine.os';
      expect(resolve('client_ip', query)).toBe('clientip');
      expect(resolve('os', query)).toBe('machine.os');
    });

    it('resolves only the plain-column rename when EVAL mixes a rename and a computed column', () => {
      const query =
        'FROM kibana_sample_data_logs | EVAL renamed_host = CONCAT(host, "*"), clientip_renamed = clientip | KEEP clientip_renamed, renamed_host, bytes';
      // plain column rename: should resolve to source field
      expect(resolve('clientip_renamed', query)).toBe('clientip');
      // computed column: should not resolve (not filterable)
      expect(resolve('renamed_host', query)).toBe('renamed_host');
      // untouched field: no change
      expect(resolve('bytes', query)).toBe('bytes');
    });
  });

  describe('STATS BY aliases and TBUCKET', () => {
    it('unwinds STATS ... BY newName = agent.keyword to the dotted source field', () => {
      const query =
        'FROM kibana_sample_data_logs | STATS count = COUNT(*) BY `Over time` = TBUCKET(50), newName = agent.keyword';
      expect(resolve('newName', query)).toBe('agent.keyword');
    });

    it('does not treat TBUCKET assignment as a STATS column rename for the time alias', () => {
      const query =
        'FROM kibana_sample_data_logs | STATS count = COUNT(*) BY `Over time` = TBUCKET(50), newName = agent.keyword';
      expect(resolve('Over time', query)).toBe('Over time');
    });

    it('matches lens-style STATS with bare dotted BY column and TBUCKET', () => {
      const query =
        'FROM kibana_sample_data_logs | STATS count = COUNT(*) BY `Over time` = TBUCKET(50), agent.keyword';
      expect(resolve('agent.keyword', query)).toBe('agent.keyword');
      expect(resolve('count', query)).toBe('count');
    });

    it('chains STATS BY dotted alias with a following RENAME', () => {
      const query =
        'FROM kibana_sample_data_logs | STATS count = COUNT(*) BY `Over time` = TBUCKET(50), newName = agent.keyword | RENAME newName AS ua';
      expect(resolve('ua', query)).toBe('agent.keyword');
    });

    it('chains STATS BY dotted alias with multiple RENAME steps', () => {
      const query =
        'FROM kibana_sample_data_logs | STATS count = COUNT(*) BY newName = agent.keyword | RENAME newName AS n2 | RENAME n2 AS n3';
      expect(resolve('n3', query)).toBe('agent.keyword');
    });

    it('unwinds RENAME of a STATS expression column to the expression text', () => {
      const query =
        'FROM kibana_sample_data_logs | STATS COUNT() BY categorize(message) | RENAME `CATEGORIZE(message)` AS pattern';
      expect(resolve('pattern', query)).toBe('CATEGORIZE(message)');
    });

    it('does not unwind through STATS categorize alias (not a simple column rename in summary)', () => {
      const query =
        'FROM kibana_sample_data_logs | STATS COUNT() BY pattern = categorize(message) | RENAME pattern AS meow';
      expect(resolve('meow', query)).toBe('meow');
    });
  });

  describe('FORK branches', () => {
    it('resolves EVAL renames inside FORK branches', () => {
      const query =
        'FROM kibana_sample_data_logs | FORK (EVAL c = bytes) (EVAL f = agent.keyword) | KEEP c, f';
      expect(resolve('c', query)).toBe('bytes');
      expect(resolve('f', query)).toBe('agent.keyword');
    });
  });

  describe('ENRICH WITH aliases', () => {
    it('resolves ENRICH ... WITH new_name = enrich_field as a rename', () => {
      const query = 'FROM logs | ENRICH servers ON host WITH server_name = host_name';
      expect(resolve('server_name', query)).toBe('host_name');
    });

    it('does not resolve ENRICH fields that have no alias', () => {
      const query = 'FROM logs | ENRICH servers ON host WITH host_name';
      expect(resolve('host_name', query)).toBe('host_name');
    });

    it('chains ENRICH alias with a following RENAME', () => {
      const query =
        'FROM logs | ENRICH servers ON host WITH server_name = host_name | RENAME server_name AS sn';
      expect(resolve('sn', query)).toBe('host_name');
    });
  });

  describe('invalidation after RENAME (DROP / EVAL shadowing)', () => {
    it('returns output column name when RENAME output is dropped then redefined by EVAL', () => {
      const query =
        'FROM kibana_sample_data_logs | RENAME agent.keyword AS x | DROP x | EVAL x = "literal"';
      expect(resolve('x', query)).toBe('x');
    });

    it('returns output column name when RENAME output is shadowed by EVAL with same name', () => {
      const query =
        'FROM kibana_sample_data_logs | RENAME agent.keyword AS x | EVAL x = CONCAT(x, "_suffix")';
      expect(resolve('x', query)).toBe('x');
    });
  });
});
