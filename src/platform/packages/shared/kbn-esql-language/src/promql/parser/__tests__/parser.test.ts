/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PromQLParser } from '../parser';

describe('PromQL Parser', () => {
  describe('basic parsing', () => {
    it('parses a simple metric selector', () => {
      const result = PromQLParser.parse('http_requests_total');

      expect(result.errors).toHaveLength(0);
      expect(result.root.type).toBe('query');
      expect(result.root.dialect).toBe('promql');
      expect(result.root.expression).toBeDefined();
      expect(result.root.expression?.type).toBe('selector');
    });

    it('parses a metric selector with labels', () => {
      const result = PromQLParser.parse('http_requests_total{job="api", status="200"}');

      expect(result.errors).toHaveLength(0);
      expect(result.root.expression?.type).toBe('selector');

      const selector = result.root.expression as any;
      expect(selector.metric?.name).toBe('http_requests_total');
      expect(selector.labelMap?.args).toHaveLength(2);
      expect(selector.labelMap?.args[0].labelName.name).toBe('job');
      expect(selector.labelMap?.args[1].labelName.name).toBe('status');
    });

    it('parses a range vector selector', () => {
      const result = PromQLParser.parse('http_requests_total[5m]');

      expect(result.errors).toHaveLength(0);
      expect(result.root.expression?.type).toBe('selector');

      const selector = result.root.expression as any;
      expect(selector.duration).toBeDefined();
    });

    it('parses a function call', () => {
      const result = PromQLParser.parse('rate(http_requests_total[5m])');

      expect(result.errors).toHaveLength(0);
      expect(result.root.expression?.type).toBe('function');

      const func = result.root.expression as any;
      expect(func.name).toBe('rate');
      expect(func.args).toHaveLength(1);
    });

    it('parses an aggregation with grouping', () => {
      const result = PromQLParser.parse('sum by (job) (rate(http_requests_total[5m]))');

      expect(result.errors).toHaveLength(0);
      expect(result.root.expression?.type).toBe('function');

      const func = result.root.expression as any;
      expect(func.name).toBe('sum');
      expect(func.grouping).toBeDefined();
      expect(func.grouping.name).toBe('by');
      expect(func.grouping.args).toHaveLength(1);
    });

    it('parses a binary expression', () => {
      const result = PromQLParser.parse('http_requests_total / http_requests_failed');

      expect(result.errors).toHaveLength(0);
      expect(result.root.expression?.type).toBe('binary-expression');

      const binary = result.root.expression as any;
      expect(binary.name).toBe('/');
      expect(binary.left.type).toBe('selector');
      expect(binary.right.type).toBe('selector');
    });

    it('parses a comparison with bool modifier', () => {
      const result = PromQLParser.parse('http_requests_total > bool 100');

      expect(result.errors).toHaveLength(0);
      expect(result.root.expression?.type).toBe('binary-expression');

      const binary = result.root.expression as any;
      expect(binary.name).toBe('>');
      expect(binary.bool).toBe(true);
    });

    it('parses a unary negation', () => {
      const result = PromQLParser.parse('-http_requests_total');

      expect(result.errors).toHaveLength(0);
      expect(result.root.expression?.type).toBe('unary-expression');

      const unary = result.root.expression as any;
      expect(unary.name).toBe('-');
    });

    it('parses parenthesized expressions', () => {
      const result = PromQLParser.parse('(http_requests_total + http_requests_failed)');

      expect(result.errors).toHaveLength(0);
      expect(result.root.expression?.type).toBe('parens');

      const parens = result.root.expression as any;
      expect(parens.child.type).toBe('binary-expression');
    });

    it('parses offset modifier', () => {
      const result = PromQLParser.parse('http_requests_total offset 5m');

      expect(result.errors).toHaveLength(0);
      expect(result.root.expression?.type).toBe('selector');

      const selector = result.root.expression as any;
      expect(selector.evaluation).toBeDefined();
      expect(selector.evaluation.offset).toBeDefined();
    });

    it('parses numeric literals', () => {
      const result = PromQLParser.parse('42');

      expect(result.errors).toHaveLength(0);
      expect(result.root.expression?.type).toBe('literal');

      const literal = result.root.expression as any;
      expect(literal.literalType).toBe('integer');
      expect(literal.value).toBe(42);
    });

    it('parses decimal literals', () => {
      const result = PromQLParser.parse('3.14');

      expect(result.errors).toHaveLength(0);
      expect(result.root.expression?.type).toBe('literal');

      const literal = result.root.expression as any;
      expect(literal.literalType).toBe('decimal');
      expect(literal.value).toBe(3.14);
    });

    it('parses string literals', () => {
      const result = PromQLParser.parse('"hello world"');

      expect(result.errors).toHaveLength(0);
      expect(result.root.expression?.type).toBe('literal');

      const literal = result.root.expression as any;
      expect(literal.literalType).toBe('string');
      expect(literal.valueUnquoted).toBe('hello world');
    });
  });

  describe('complex queries', () => {
    it('parses a complex aggregation query', () => {
      const query = 'sum(rate(http_requests_total{job="api"}[5m])) by (status)';
      const result = PromQLParser.parse(query);

      expect(result.errors).toHaveLength(0);
      expect(result.root.expression?.type).toBe('function');
    });

    it('parses vector matching with on modifier', () => {
      const query = 'http_requests_total / on(job) http_requests_failed';
      const result = PromQLParser.parse(query);

      expect(result.errors).toHaveLength(0);
      expect(result.root.expression?.type).toBe('binary-expression');

      const binary = result.root.expression as any;
      expect(binary.modifier).toBeDefined();
      expect(binary.modifier.name).toBe('on');
    });

    it('parses group_left modifier', () => {
      const query = 'http_requests_total * on(job) group_left(instance) job_info';
      const result = PromQLParser.parse(query);

      expect(result.errors).toHaveLength(0);
      expect(result.root.expression?.type).toBe('binary-expression');

      const binary = result.root.expression as any;
      expect(binary.modifier.groupModifier).toBeDefined();
      expect(binary.modifier.groupModifier.name).toBe('group_left');
    });
  });

  describe('error handling', () => {
    it('returns errors for invalid syntax', () => {
      const result = PromQLParser.parse('rate(');

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('handles empty input', () => {
      const result = PromQLParser.parse('');

      expect(result.root.type).toBe('query');
    });
  });
});
