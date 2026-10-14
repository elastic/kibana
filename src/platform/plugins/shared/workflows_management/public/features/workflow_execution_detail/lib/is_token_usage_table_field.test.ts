/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isTokenUsageTableField } from './is_token_usage_table_field';

describe('isTokenUsageTableField', () => {
  it('matches the tokenUsage object and any nested field path', () => {
    expect(isTokenUsageTableField('metadata.tokenUsage')).toBe(true);
    expect(isTokenUsageTableField('metadata.tokenUsage.promptTokens')).toBe(true);
    expect(isTokenUsageTableField('metadata.tokenUsage.completionTokens')).toBe(true);
    expect(isTokenUsageTableField('metadata.tokenUsage.totalTokens')).toBe(true);
    expect(isTokenUsageTableField('metadata.tokenUsage.extraField')).toBe(true);
  });

  it('does not match unrelated metadata or sibling fields', () => {
    expect(isTokenUsageTableField('metadata.model')).toBe(false);
    expect(isTokenUsageTableField('metadata.usage.inputTokens')).toBe(false);
    expect(isTokenUsageTableField('tokenUsage.promptTokens')).toBe(false);
    expect(isTokenUsageTableField('content')).toBe(false);
  });
});
