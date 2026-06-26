/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateReadOnlyGraphQLQuery } from './validate_read_only_query';

describe('validateReadOnlyGraphQLQuery', () => {
  it('allows query operations', () => {
    expect(() =>
      validateReadOnlyGraphQLQuery('query OrgRepos { organization(login: "elastic") { id } }')
    ).not.toThrow();
  });

  it('rejects mutation operations', () => {
    expect(() =>
      validateReadOnlyGraphQLQuery('mutation CreateIssue { createIssue(input: {}) { issue { id } } }')
    ).toThrow('GraphQL mutations are not allowed');
  });

  it('rejects subscription operations', () => {
    expect(() =>
      validateReadOnlyGraphQLQuery('subscription OnIssue { issueUpdated { id } }')
    ).toThrow('GraphQL subscriptions are not allowed');
  });

  it('ignores mutation keyword inside comments', () => {
    expect(() =>
      validateReadOnlyGraphQLQuery(`
        # mutation CreateIssue
        query OrgRepos { organization(login: "elastic") { id } }
      `)
    ).not.toThrow();
  });

  it('rejects empty queries', () => {
    expect(() => validateReadOnlyGraphQLQuery('   ')).toThrow('must not be empty');
  });
});
