/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getCreationAliases } from './get_creation_aliases';

describe('getCreationAliases', () => {
  it('returns the correct list of alias', () => {
    const aliases = getCreationAliases({ indexPrefix: '.kibana', kibanaVersion: '8.13.0' });
    expect(aliases).toEqual(['.kibana', '.kibana_8.13.0']);
  });

  it('returns the correct version alias', () => {
    const aliases = getCreationAliases({ indexPrefix: '.kibana', kibanaVersion: '8.17.2' });
    expect(aliases).toEqual(['.kibana', '.kibana_8.17.2']);
  });
});
