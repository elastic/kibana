/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { chain, isEmpty, startCase } from 'lodash';
import { ComplexityReportGenerator } from './complexity';
import { Lookup } from './lookup';

const OPTIONS = ['package', 'plugin', 'owner'];
const OPTIONS_PATTERN = new RegExp(`--(${OPTIONS.join('|')})=(.*)$`);

export async function generateComplexityReport() {
  const lookup = new Lookup();
  const complexityReportGenerator = new ComplexityReportGenerator({ complexity: 1 });

  const { pattern, ...filter } = chain(process.argv)
    .drop(2)
    .map((arg) => {
      const parameter = OPTIONS_PATTERN.exec(arg);
      if (!parameter) {
        return ['pattern', arg];
      }

      const [, key, value] = parameter;

      return [key, value];
    })
    .groupBy('0')
    .mapValues((values) => values.map(([, value]) => value))
    .value();

  const table = {} as Record<string, Record<string, number>>;

  for (const { name, path } of [
    ...(isEmpty(filter) && isEmpty(pattern) ? await lookup.lookup() : []),
    ...(!isEmpty(filter) ? await lookup.lookup(filter) : []),
    ...(!isEmpty(pattern) ? [{ name: '', path: pattern }] : []),
  ]) {
    const report = await complexityReportGenerator.generate(path);
    table[name] = chain(report)
      .mapKeys((value, key) => startCase(key))
      .mapValues((value) => Math.round(value * 100) / 100)
      .value();
  }

  // eslint-disable-next-line no-console
  console.table(table);
}
