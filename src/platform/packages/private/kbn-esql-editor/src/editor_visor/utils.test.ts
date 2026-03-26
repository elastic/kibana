/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { generateIndexPatterns } from './utils';

describe('generateIndexPatterns', () => {
  it('generates index patterns for indices with common prefixes', () => {
    const sourceNames = [
      'logs-2023.01.01',
      'logs-2023.01.02',
      'metrics-01',
      'metrics-02',
      'kibana-sample-data-logs',
      'kibana-sample-data-ecommerce',
    ];
    const patterns = generateIndexPatterns(sourceNames);
    expect(patterns).toEqual(['kibana-*', 'logs-*', 'metrics-*']);
  });

  it('doesnt generate patterns for indices without common prefixes', () => {
    const sourceNames = ['plain-index', 'another-index', 'logs-2023.01.01'];
    const patterns = generateIndexPatterns(sourceNames);
    expect(patterns).toEqual([]);
  });
});
