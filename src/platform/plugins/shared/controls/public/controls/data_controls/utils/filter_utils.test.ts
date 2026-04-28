/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setStubKibanaServices } from '../../../services/mocks';
import { buildESQLPreFilter } from './filter_utils';

describe('buildESQLPreFilter', () => {
  beforeAll(() => {
    setStubKibanaServices();
  });

  const phraseFilter = (field: string, value: string) => ({
    meta: { type: 'phrase', key: field, params: { query: value } },
    query: { match_phrase: { [field]: value } },
  });

  it('returns undefined when there is no global query and no filters', () => {
    const result = buildESQLPreFilter({ query: undefined, filters: undefined }, true);
    expect(result).toBeUndefined();
  });

  it('returns undefined when filters are gated off and there is no global query', () => {
    const result = buildESQLPreFilter(
      { query: undefined, filters: [phraseFilter('host', 'mainframe')] },
      false
    );
    expect(result).toBeUndefined();
  });

  it('drops ES|QL global queries because they cannot be translated to DSL', () => {
    const result = buildESQLPreFilter({ query: { esql: 'FROM logs' }, filters: undefined }, true);
    expect(result).toBeUndefined();
  });

  it('builds a bool filter from a global KQL query', () => {
    const result = buildESQLPreFilter(
      { query: { language: 'kuery', query: 'level: "error"' }, filters: undefined },
      true
    );
    expect(result?.bool).toBeDefined();
    expect(JSON.stringify(result)).toContain('error');
  });

  it('includes ad-hoc filters when useGlobalFilters is true', () => {
    const result = buildESQLPreFilter(
      { query: undefined, filters: [phraseFilter('host', 'mainframe')] },
      true
    );
    expect(result?.bool).toBeDefined();
    expect(JSON.stringify(result)).toContain('mainframe');
  });

  it('omits ad-hoc filters when useGlobalFilters is false even if a global query is present', () => {
    const result = buildESQLPreFilter(
      {
        query: { language: 'kuery', query: 'level: "error"' },
        filters: [phraseFilter('host', 'mainframe')],
      },
      false
    );
    expect(JSON.stringify(result)).not.toContain('mainframe');
    expect(JSON.stringify(result)).toContain('error');
  });
});
