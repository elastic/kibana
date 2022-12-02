/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { chain, flow, fromPairs, map, mergeWith, set } from 'lodash';
import { ESLint, Linter, Rule } from 'eslint';
import { Lookup } from './lookup';

enum ComplexityRule {
  Complexity = 'complexity',
  MaxDepth = 'max-depth',
  MaxLines = 'max-lines',
  MaxLinesPerFunction = 'max-lines-per-function',
  MaxNestedCallbacks = 'max-nested-callbacks',
  MaxParams = 'max-params',
  MaxStatements = 'max-statements',
}

interface ComplexityMetrics {
  complexity: number;
  depth: number;
  lines: number;
  linesPerFunction: number;
  nestedCallbacks: number;
  params: number;
  statements: number;
}

interface ComplexityReportMapping {
  rule: ComplexityRule;
  data: string;
  metric: keyof ComplexityMetrics;
}

interface ComplexityReportGroup {
  name: string;
  path: string;
}

type ComplexityReport = Record<string, ComplexityMetrics>;

export class ComplexityReportGenerator {
  private static mappings: ComplexityReportMapping[] = [
    { rule: ComplexityRule.Complexity, data: 'complexity', metric: 'complexity' },
    { rule: ComplexityRule.MaxDepth, data: 'depth', metric: 'depth' },
    { rule: ComplexityRule.MaxLines, data: 'actual', metric: 'lines' },
    { rule: ComplexityRule.MaxLinesPerFunction, data: 'lineCount', metric: 'linesPerFunction' },
    { rule: ComplexityRule.MaxNestedCallbacks, data: 'num', metric: 'nestedCallbacks' },
    { rule: ComplexityRule.MaxParams, data: 'count', metric: 'params' },
    { rule: ComplexityRule.MaxStatements, data: 'count', metric: 'statements' },
  ];

  private esLint: ESLint;
  private linter = new Linter();
  private count!: ComplexityReport;
  private total!: ComplexityReport;
  private groups!: ComplexityReportGroup[];

  constructor(private lookup: Lookup, threshold: Partial<ComplexityMetrics> = {}) {
    this.esLint = new ESLint({
      errorOnUnmatchedPattern: false,
      overrideConfig: {
        noInlineConfig: true,
        rules: {
          ...ComplexityReportGenerator.mappings.reduce(
            (rules, { metric, rule }) => set(rules, rule, ['error', threshold[metric] ?? 0]),
            {}
          ),
          [ComplexityRule.MaxLinesPerFunction]: ['error', { max: threshold.linesPerFunction ?? 0 }],
        },
      },
    });
  }

  private patch() {
    const rules = this.linter.getRules();

    const originalRules = map(ComplexityRule, (name) => {
      const rule = rules.get(name)!;
      const { create } = rule;

      rule.create = (context) =>
        create(
          new Proxy(
            {
              report: (message) => {
                this.process(context, message);
                return context.report(message);
              },
            } as Partial<typeof context>,
            { get: (target, prop: keyof typeof context) => target[prop] ?? context[prop] }
          ) as typeof context
        );

      return { create, rule };
    });

    return () =>
      originalRules.forEach(({ create, rule }) => {
        rule.create = create;
      });
  }

  private async initialize() {
    this.count = {};
    this.total = {};
    this.groups = await this.lookup.lookup();
  }

  private process(context: Rule.RuleContext, message: Rule.ReportDescriptor) {
    const { id } = context;
    const mapping = ComplexityReportGenerator.mappings.find(({ rule }) => rule === id);
    if (!mapping) {
      return;
    }
    if (!message.data || !(mapping.data in message.data)) {
      return;
    }

    const file = context.getFilename();
    const group = this.groups.find(({ path }) => file.startsWith(path))?.name ?? '';

    if (!this.count[group] || !this.total[group]) {
      this.count[group] = chain(ComplexityReportGenerator.mappings)
        .map(({ metric }) => [metric, 0])
        .fromPairs()
        .value() as ComplexityMetrics;
      this.total[group] = { ...this.count[group] } as ComplexityMetrics;
    }

    this.total[group][mapping.metric] += +message.data[mapping.data];
    this.count[group][mapping.metric]++;
  }

  private finalize() {
    const getAverage = flow(
      (total: ComplexityMetrics, count: ComplexityMetrics) =>
        map(ComplexityReportGenerator.mappings, ({ metric }) => [
          metric,
          count[metric] ? total[metric] / count[metric] : 0,
        ]),
      fromPairs
    );

    return mergeWith(this.total, this.count, getAverage) as ComplexityReport;
  }

  async generate(patterns: string | string[]): Promise<ComplexityReport> {
    const restore = this.patch();
    try {
      await this.initialize();
      await this.esLint.lintFiles(patterns);

      return this.finalize();
    } finally {
      restore();
    }
  }
}
