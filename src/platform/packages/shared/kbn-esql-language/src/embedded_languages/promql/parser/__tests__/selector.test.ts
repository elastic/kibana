/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PromQLParser } from '../parser';
import { printAst } from '../../../../debug';
import type { PromQLSelector } from '../../types';

describe('PromQL "selector" node parsing', () => {
  const parseSelector = (query: string): PromQLSelector => {
    const result = PromQLParser.parse(query);
    expect(result.errors).toHaveLength(0);
    expect(result.root.expression?.type).toBe('selector');

    return result.root.expression as PromQLSelector;
  };

  describe('basic selectors', () => {
    it('parses a simple metric selector', () => {
      const selector = parseSelector('http_requests_total');

      expect(selector.name).toBe('http_requests_total');
      expect(selector.metric?.name).toBe('http_requests_total');
      expect(selector.labelMap).toBeUndefined();
      expect(selector.duration).toBeUndefined();
      expect(selector.evaluation).toBeUndefined();
    });

    it('parses a metric selector with empty curly braces', () => {
      const selector = parseSelector('http_requests_total{}');

      expect(selector.metric?.name).toBe('http_requests_total');
      expect(selector.labelMap).toBeDefined();
      expect(selector.labelMap?.args).toHaveLength(0);
      expect(selector.labelMap?.text).toBe('{}');
    });

    it('parses a metric selector with labels', () => {
      const selector = parseSelector('http_requests_total{job="api"}');

      expect(selector.metric?.name).toBe('http_requests_total');
      expect(selector.labelMap).toBeDefined();
      expect(selector.labelMap?.args).toHaveLength(1);
      expect(selector.labelMap?.args[0].labelName.name).toBe('job');
      expect(selector.labelMap?.args[0].operator).toBe('=');
    });

    it('parses a label-only selector (no metric)', () => {
      const selector = parseSelector('{job="api"}');

      expect(selector.metric).toBeUndefined();
      expect(selector.labelMap).toBeDefined();
      expect(selector.labelMap?.args).toHaveLength(1);
    });
  });

  describe('args array', () => {
    it('includes only metric when no labels/duration/evaluation', () => {
      const selector = parseSelector('http_requests_total');

      expect(selector.args).toHaveLength(1);
      expect(selector.args[0].type).toBe('identifier');
      expect(selector.args[0].name).toBe('http_requests_total');
    });

    it('includes metric and labelMap when labels present', () => {
      const selector = parseSelector('http_requests_total{job="api"}');

      expect(selector.args).toHaveLength(2);
      expect(selector.args[0].type).toBe('identifier');
      expect(selector.args[1].type).toBe('label-map');
    });

    it('includes metric, labelMap, and duration when range present', () => {
      const selector = parseSelector('http_requests_total{job="api"}[5m]');

      expect(selector.args).toHaveLength(3);
      expect(selector.args[0].type).toBe('identifier');
      expect(selector.args[1].type).toBe('label-map');
      expect(selector.args[2].type).toBe('literal');
    });

    it('includes all children when evaluation is present', () => {
      const selector = parseSelector('http_requests_total{job="api"}[5m] offset 1h');

      expect(selector.args).toHaveLength(4);
      expect(selector.args[0].type).toBe('identifier');
      expect(selector.args[1].type).toBe('label-map');
      expect(selector.args[2].type).toBe('literal');
      expect(selector.args[3].type).toBe('evaluation');
    });

    it('handles label-only selector in args', () => {
      const selector = parseSelector('{job="api"}[5m]');

      expect(selector.args).toHaveLength(2);
      expect(selector.args[0].type).toBe('label-map');
      expect(selector.args[1].type).toBe('literal');
    });

    it('handles selector with duration but no labels', () => {
      const selector = parseSelector('http_requests_total[5m]');

      expect(selector.args).toHaveLength(2);
      expect(selector.args[0].type).toBe('identifier');
      expect(selector.args[1].type).toBe('literal');
    });
  });

  describe('labelMap structure', () => {
    it('labelMap contains labels in args', () => {
      const selector = parseSelector('http_requests_total{job="api", status="200"}');

      expect(selector.labelMap).toBeDefined();
      expect(selector.labelMap?.type).toBe('label-map');
      expect(selector.labelMap?.args).toHaveLength(2);
      expect(selector.labelMap?.args[0].type).toBe('label');
      expect(selector.labelMap?.args[1].type).toBe('label');
    });

    it('parses multiple label matchers', () => {
      const selector = parseSelector(
        'http_requests_total{job="api", status=~"5..", instance!="localhost"}'
      );

      expect(selector.labelMap?.args).toHaveLength(3);
      expect(selector.labelMap?.args[0].operator).toBe('=');
      expect(selector.labelMap?.args[1].operator).toBe('=~');
      expect(selector.labelMap?.args[2].operator).toBe('!=');
    });

    it('parses negative regex matcher', () => {
      const selector = parseSelector('{job!~"test.*"}');

      expect(selector.labelMap?.args).toHaveLength(1);
      expect(selector.labelMap?.args[0].operator).toBe('!~');
    });
  });

  describe('range vector selectors', () => {
    it('parses a range vector selector with time duration', () => {
      const selector = parseSelector('http_requests_total[5m]');

      expect(selector.duration).toBeDefined();
      expect(selector.duration?.type).toBe('literal');
    });

    it('parses a range vector with labels and duration', () => {
      const selector = parseSelector('http_requests_total{job="api"}[1h]');

      expect(selector.metric?.name).toBe('http_requests_total');
      expect(selector.labelMap?.args).toHaveLength(1);
      expect(selector.duration).toBeDefined();
    });
  });

  describe('evaluation modifiers', () => {
    it('parses offset modifier', () => {
      const selector = parseSelector('http_requests_total offset 5m');

      expect(selector.evaluation).toBeDefined();
      expect(selector.evaluation?.offset).toBeDefined();
      expect(selector.evaluation?.offset?.negative).toBe(false);
    });

    it('parses negative offset modifier', () => {
      const selector = parseSelector('http_requests_total offset - 5m');

      expect(selector.evaluation?.offset?.negative).toBe(true);
    });

    it('parses @ modifier', () => {
      const selector = parseSelector('http_requests_total @ 1609459200');

      expect(selector.evaluation).toBeDefined();
      expect(selector.evaluation?.at).toBeDefined();
    });

    it('parses offset and @ modifiers together', () => {
      const selector = parseSelector('http_requests_total offset 5m @ 1609459200');

      expect(selector.evaluation?.offset).toBeDefined();
      expect(selector.evaluation?.at).toBeDefined();
    });

    it('parses range vector with evaluation modifiers', () => {
      const selector = parseSelector('http_requests_total[5m] offset 1h');

      expect(selector.duration).toBeDefined();
      expect(selector.evaluation?.offset).toBeDefined();
    });
  });

  describe('selector location tracking', () => {
    it('tracks selector location correctly', () => {
      const selector = parseSelector('  http_requests_total  ');
      const tree = printAst(selector);

      expect('\n' + tree).toBe(`
selector 2-20 "http_requests_total"
└─ identifier 2-20 "http_requests_total"`);
    });

    it('tracks location with labels', () => {
      const selector = parseSelector('http_requests_total{job="api"}');
      const tree = printAst(selector);

      expect('\n' + tree).toBe(`
selector 0-29 "http_requests_total"
├─ identifier 0-18 "http_requests_total"
└─ label-map 20-28
   └─ label 20-28 "job"
      ├─ identifier 20-22 "job"
      └─ literal 24-28 ""api""`);
    });

    it('tracks location with duration', () => {
      const selector = parseSelector('http_requests_total[5m]');
      const tree = printAst(selector);

      expect('\n' + tree).toBe(`
selector 0-22 "http_requests_total"
├─ identifier 0-18 "http_requests_total"
└─ literal 20-21 "5m"`);
    });

    it('tracks location with labels and duration', () => {
      const selector = parseSelector('http_requests_total{job="api"}[5m]');
      const tree = printAst(selector);

      expect('\n' + tree).toBe(`
selector 0-33 "http_requests_total"
├─ identifier 0-18 "http_requests_total"
├─ label-map 20-28
│  └─ label 20-28 "job"
│     ├─ identifier 20-22 "job"
│     └─ literal 24-28 ""api""
└─ literal 31-32 "5m"`);
    });

    it('tracks location with evaluation modifiers', () => {
      const selector = parseSelector('http_requests_total offset 5m');
      const tree = printAst(selector);

      expect('\n' + tree).toBe(`
selector 0-28 "http_requests_total"
├─ identifier 0-18 "http_requests_total"
└─ evaluation 20-28 "evaluation"`);
    });
  });
});
