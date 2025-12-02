/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Unit tests for query transformation logic
 * Tests the rule.* to kibana.alert.rule.* mapping
 */

describe('Query transformation for alerts', () => {
  // Simulate the transformQueryForAlerts function
  const transformQueryForAlerts = (query: { query?: string; language: string }) => {
    if (!query.query || typeof query.query !== 'string') {
      return query;
    }

    let transformedQuery = query.query;
    // Replace rule.* with kibana.alert.rule.* using regex
    transformedQuery = transformedQuery.replace(
      /\brule\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g,
      'kibana.alert.rule.$1'
    );

    return {
      ...query,
      query: transformedQuery,
    };
  };

  it('transforms rule.name to kibana.alert.rule.name', () => {
    const query = { query: 'rule.name:*', language: 'kuery' };
    const result = transformQueryForAlerts(query);
    expect(result.query).toBe('kibana.alert.rule.name:*');
  });

  it('transforms rule.name with value to kibana.alert.rule.name', () => {
    const query = { query: 'rule.name:Test*', language: 'kuery' };
    const result = transformQueryForAlerts(query);
    expect(result.query).toBe('kibana.alert.rule.name:Test*');
  });

  it('transforms rule.uuid to kibana.alert.rule.uuid', () => {
    const query = { query: 'rule.uuid:abc-123', language: 'kuery' };
    const result = transformQueryForAlerts(query);
    expect(result.query).toBe('kibana.alert.rule.uuid:abc-123');
  });

  it('transforms multiple rule fields in a query', () => {
    const query = { query: 'rule.name:Test* AND rule.uuid:abc-123', language: 'kuery' };
    const result = transformQueryForAlerts(query);
    expect(result.query).toBe('kibana.alert.rule.name:Test* AND kibana.alert.rule.uuid:abc-123');
  });

  it('transforms rule.category to kibana.alert.rule.category', () => {
    const query = { query: 'rule.category:security', language: 'kuery' };
    const result = transformQueryForAlerts(query);
    expect(result.query).toBe('kibana.alert.rule.category:security');
  });

  it('transforms rule.tags to kibana.alert.rule.tags', () => {
    const query = { query: 'rule.tags:important', language: 'kuery' };
    const result = transformQueryForAlerts(query);
    expect(result.query).toBe('kibana.alert.rule.tags:important');
  });

  it('does not transform non-rule fields', () => {
    const query = { query: 'message:test AND @timestamp:now-1h', language: 'kuery' };
    const result = transformQueryForAlerts(query);
    expect(result.query).toBe('message:test AND @timestamp:now-1h');
  });

  it('does not transform rule as part of another word', () => {
    const query = { query: 'rulename:test', language: 'kuery' };
    const result = transformQueryForAlerts(query);
    expect(result.query).toBe('rulename:test');
  });

  it('handles empty query', () => {
    const query = { query: '', language: 'kuery' };
    const result = transformQueryForAlerts(query);
    expect(result.query).toBe('');
  });

  it('handles query without query string', () => {
    const query = { language: 'kuery' };
    const result = transformQueryForAlerts(query);
    expect(result).toEqual(query);
  });

  it('handles complex query with mixed fields', () => {
    const query = {
      query: 'rule.name:Test* AND message:error AND rule.category:security',
      language: 'kuery',
    };
    const result = transformQueryForAlerts(query);
    expect(result.query).toBe(
      'kibana.alert.rule.name:Test* AND message:error AND kibana.alert.rule.category:security'
    );
  });

  it('preserves query language', () => {
    const query = { query: 'rule.name:*', language: 'kuery' };
    const result = transformQueryForAlerts(query);
    expect(result.language).toBe('kuery');
  });
});
