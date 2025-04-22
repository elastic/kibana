/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractSemanticsFromGrok } from './fields_suggestions_after';

describe('extractSemanticsFromGrok', () => {
  it('should extract column names from grok patterns', () => {
    const pattern1 = '%{IP:ip} [%{TIMESTAMP_ISO8601:@timestamp}] %{GREEDYDATA:status}';
    const columns1 = extractSemanticsFromGrok(pattern1);
    expect(columns1).toStrictEqual(['ip', '@timestamp', 'status']);

    const pattern2 = '%{WORD:word1} - %{NUMBER:count}';
    const columns2 = extractSemanticsFromGrok(pattern2);
    expect(columns2).toStrictEqual(['word1', 'count']);

    const pattern3 = 'Some plain text without grok patterns';
    const columns3 = extractSemanticsFromGrok(pattern3);
    expect(columns3).toStrictEqual([]);
  });
});
