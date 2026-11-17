/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { timerange, type ApmFields } from '@kbn/synthtrace-client';
import type { ToolingLog } from '@kbn/tooling-log';
import { generateClassicRumPageLoads } from './classic_rum_page_loads';

const range = timerange(
  new Date('2026-10-16T12:00:00.000Z'),
  new Date('2026-10-16T12:02:00.000Z'),
  {} as ToolingLog
);

const collect = (): ApmFields[] =>
  Array.from(
    generateClassicRumPageLoads(range, { environment: 'test', scale: 1, seed: 'classic-rum-test' })
  ).flatMap((event) => event.serialize());

const getEnd = (doc: ApmFields): number => {
  const durationUs = doc['transaction.duration.us'] ?? doc['span.duration.us'] ?? 0;
  return Number(doc['@timestamp']) + durationUs / 1000;
};

describe('generateClassicRumPageLoads', () => {
  const docs = collect();
  const transactions = docs.filter((doc) => doc['processor.event'] === 'transaction');
  const spans = docs.filter((doc) => doc['processor.event'] === 'span');

  it('generates a page load with one XHR span per tick', () => {
    expect(transactions).toHaveLength(6);
    expect(spans).toHaveLength(6);
  });

  it('ends every page load and span within the range', () => {
    [...transactions, ...spans].forEach((doc) =>
      expect(getEnd(doc)).toBeLessThanOrEqual(range.to.getTime())
    );
  });

  it('keeps every span within its page load', () => {
    spans.forEach((span) => {
      const transaction = transactions.find(
        (candidate) => candidate['transaction.id'] === span['transaction.id']
      );
      if (!transaction) {
        throw new Error(`No page load for span ${span['span.id']}`);
      }

      expect(Number(span['@timestamp'])).toBeGreaterThanOrEqual(Number(transaction['@timestamp']));
      expect(getEnd(span)).toBeLessThanOrEqual(getEnd(transaction));
    });
  });
});
