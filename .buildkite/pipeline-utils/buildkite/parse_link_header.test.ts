/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from 'chai';
import { parseLinkHeader } from './parse_link_header';

describe('parseLinkHeader', () => {
  it('should parse link header', () => {
    const result = parseLinkHeader(
      '<https://api.buildkite.com/v2/organizations/elastic/agents?page=2&per_page=1>; rel="next", <https://api.buildkite.com/v2/organizations/elastic/agents?page=5&per_page=1>; rel="last"'
    );

    expect(result).to.eql({
      last: 'https://api.buildkite.com/v2/organizations/elastic/agents?page=5&per_page=1',
      next: 'https://api.buildkite.com/v2/organizations/elastic/agents?page=2&per_page=1',
    });
  });
});
