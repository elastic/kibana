/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../query';
import type { ESQLCommand, ESQLCommandOption, ESQLStringLiteral } from '../../types';

describe('PROMQL', () => {
  describe('correctly formatted', () => {
    it('parses basic PROMQL command with single param', () => {
      const text = `FROM index | PROMQL start "2024-01-01" (up{job="prometheus"})`;
      // const text = `FROM index | PROMQL k8s step 1m (sum(avg_over_time(network.cost[1m])))`;
      // const text = `FROM index`;
      const query = EsqlQuery.fromSrc(text);

      // console.log(JSON.stringify(query.ast, null, 2));

      expect(query.ast.commands[1]).toMatchObject({
        type: 'command',
        name: 'promql',
        incomplete: false,
      });
    });

    it('parses PROMQL command with multiple params', () => {
      const text = `FROM index | PROMQL start "2024-01-01" end "2024-01-02" step "1m" (up{job="prometheus"})`;
      const query = EsqlQuery.fromSrc(text);
      const promqlCmd = query.ast.commands[1] as ESQLCommand<'promql'>;

      expect(promqlCmd).toMatchObject({
        type: 'command',
        name: 'promql',
        incomplete: false,
      });

      // Should have 3 options (start, end, step) + 1 query string
      expect(promqlCmd.args.length).toBe(4);
    });

    it('parses param name-value pairs as command options', () => {
      const text = `FROM index | PROMQL start "2024-01-01" (up)`;
      const query = EsqlQuery.fromSrc(text);
      const promqlCmd = query.ast.commands[1] as ESQLCommand<'promql'>;

      const startOption = promqlCmd.args.find(
        (arg): arg is ESQLCommandOption =>
          'type' in arg && arg.type === 'option' && arg.name === 'start'
      );

      expect(startOption).toBeDefined();
      expect(startOption).toMatchObject({
        type: 'option',
        name: 'start',
      });

      // Check that the value is parsed correctly
      expect(startOption?.args[0]).toMatchObject({
        type: 'literal',
        literalType: 'keyword',
        valueUnquoted: '2024-01-01',
      });
    });

    it('parses unquoted identifier param values', () => {
      const text = `FROM index | PROMQL step 1m (up)`;
      const query = EsqlQuery.fromSrc(text);
      const promqlCmd = query.ast.commands[1] as ESQLCommand<'promql'>;

      const stepOption = promqlCmd.args.find(
        (arg): arg is ESQLCommandOption =>
          'type' in arg && arg.type === 'option' && arg.name === 'step'
      );

      expect(stepOption).toBeDefined();
      expect(stepOption?.args[0]).toMatchObject({
        type: 'identifier',
        name: '1m',
      });
    });

    it('parses the PromQL query text', () => {
      const text = `FROM index | PROMQL start "2024-01-01" (up{job="prometheus"})`;
      const query = EsqlQuery.fromSrc(text);
      const promqlCmd = query.ast.commands[1] as ESQLCommand<'promql'>;

      // Find the query string literal (last arg that is a string literal)
      const queryArg = promqlCmd.args.find(
        (arg): arg is ESQLStringLiteral =>
          'type' in arg && arg.type === 'literal' && arg.literalType === 'keyword'
      );

      expect(queryArg).toBeDefined();
      expect(queryArg?.valueUnquoted).toContain('up{job="prometheus"}');
    });

    it('parses complex PromQL query with nested parentheses', () => {
      const text = `FROM index | PROMQL start now (sum(rate(http_requests_total{job="api"}[5m])) by (status))`;
      const query = EsqlQuery.fromSrc(text);
      const promqlCmd = query.ast.commands[1] as ESQLCommand<'promql'>;

      expect(promqlCmd).toMatchObject({
        type: 'command',
        name: 'promql',
        incomplete: false,
      });

      // Find the query string
      const queryArg = promqlCmd.args.find(
        (arg): arg is ESQLStringLiteral =>
          'type' in arg && arg.type === 'literal' && arg.literalType === 'keyword'
      );

      expect(queryArg).toBeDefined();
      // Should preserve nested parentheses
      expect(queryArg?.valueUnquoted).toContain('sum(rate(http_requests_total{job="api"}[5m]))');
    });

    it('parses PROMQL with quoted identifier param names', () => {
      const text = 'FROM index | PROMQL `start-time` "2024-01-01" (up)';
      const query = EsqlQuery.fromSrc(text);
      const promqlCmd = query.ast.commands[1] as ESQLCommand<'promql'>;

      const option = promqlCmd.args.find(
        (arg): arg is ESQLCommandOption => 'type' in arg && arg.type === 'option'
      );

      expect(option).toBeDefined();
      expect(option?.name).toBe('start-time');
    });

    it('parses empty PromQL query', () => {
      const text = `FROM index | PROMQL start "2024-01-01" ()`;
      const query = EsqlQuery.fromSrc(text);
      const promqlCmd = query.ast.commands[1] as ESQLCommand<'promql'>;

      expect(promqlCmd).toMatchObject({
        type: 'command',
        name: 'promql',
        incomplete: false,
      });
    });
  });

  describe('incorrectly formatted', () => {
    it('reports error on missing params', () => {
      const text = `FROM index | PROMQL (up)`;
      const { errors } = EsqlQuery.fromSrc(text);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('reports error on missing query parentheses', () => {
      const text = `FROM index | PROMQL start "2024-01-01"`;
      const { errors } = EsqlQuery.fromSrc(text);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('marks command as incomplete when missing closing paren', () => {
      const text = `FROM index | PROMQL start "2024-01-01" (up`;
      const query = EsqlQuery.fromSrc(text);
      const promqlCmd = query.ast.commands[1] as ESQLCommand<'promql'>;

      expect(promqlCmd.incomplete).toBe(true);
    });
  });

  describe('with parameters', () => {
    it('parses named parameters in param values', () => {
      const text = `FROM index | PROMQL start ?start_time (up)`;
      const query = EsqlQuery.fromSrc(text);
      const promqlCmd = query.ast.commands[1] as ESQLCommand<'promql'>;

      const startOption = promqlCmd.args.find(
        (arg): arg is ESQLCommandOption =>
          'type' in arg && arg.type === 'option' && arg.name === 'start'
      );

      expect(startOption).toBeDefined();
      expect(startOption?.args[0]).toMatchObject({
        type: 'literal',
        literalType: 'param',
        paramType: 'named',
        value: 'start_time',
      });
    });

    it('parses positional parameters in param values', () => {
      const text = `FROM index | PROMQL start ?1 (up)`;
      const query = EsqlQuery.fromSrc(text);
      const promqlCmd = query.ast.commands[1] as ESQLCommand<'promql'>;

      const startOption = promqlCmd.args.find(
        (arg): arg is ESQLCommandOption =>
          'type' in arg && arg.type === 'option' && arg.name === 'start'
      );

      expect(startOption).toBeDefined();
      expect(startOption?.args[0]).toMatchObject({
        type: 'literal',
        literalType: 'param',
        paramType: 'positional',
        value: 1,
      });
    });
  });
});
