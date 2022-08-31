/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { chain, map, set } from 'lodash';
import { ESLint, Linter, Rule } from 'eslint';

enum ComplexityRule {
  Complexity = 'complexity',
  MaxDepth = 'max-depth',
  MaxLines = 'max-lines',
  MaxLinesPerFunction = 'max-lines-per-function',
  MaxNestedCallbacks = 'max-nested-callbacks',
  MaxParams = 'max-params',
  MaxStatements = 'max-statements',
}

export interface ComplexityReport {
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
  metric: keyof ComplexityReport;
}

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

  private esLint = new ESLint({
    overrideConfig: {
      noInlineConfig: true,
      rules: {
        ...ComplexityReportGenerator.mappings.reduce(
          (rules, { rule }) => set(rules, rule, ['error', 0]),
          {}
        ),
        [ComplexityRule.MaxLinesPerFunction]: ['error', { max: 0 }],
      },
    },
  });
  private linter = new Linter();
  private count!: ComplexityReport;
  private total!: ComplexityReport;

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

  private process({ id }: Rule.RuleContext, message: Rule.ReportDescriptor) {
    const mapping = ComplexityReportGenerator.mappings.find(({ rule }) => rule === id);
    if (!mapping) {
      return;
    }
    if (!message.data || !(mapping.data in message.data)) {
      return;
    }

    this.total[mapping.metric] += +message.data[mapping.data];
    this.count[mapping.metric]++;
  }

  private clear() {
    this.count = chain(ComplexityReportGenerator.mappings)
      .map(({ metric }) => [metric, 0])
      .fromPairs()
      .value() as typeof this.count;
    this.total = { ...this.count } as typeof this.total;
  }

  private calculate() {
    return chain(ComplexityReportGenerator.mappings)
      .map(({ metric }) => [
        metric,
        this.count[metric] ? this.total[metric] / this.count[metric] : 0,
      ])
      .fromPairs()
      .value() as ComplexityReport;
  }

  async generate(patterns: string | string[]): Promise<ComplexityReport> {
    const restore = this.patch();
    try {
      this.clear();
      await this.esLint.lintFiles(patterns);

      return this.calculate();
    } finally {
      restore();
    }
  }
}

export function generateComplexityReport() {
  const complexityReportGenerator = new ComplexityReportGenerator();

  return complexityReportGenerator.generate(process.argv.slice(2));
}
