/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ACL_SHAPE_FIXTURES } from '../__fixtures__';
import { getAclState } from './acl_state';
import { normalizeAclSource } from './acl_source';

describe('getAclState', () => {
  it.each(ACL_SHAPE_FIXTURES.map((fixture) => [fixture.name, fixture]))(
    'returns the state the fixture table expects: %s',
    (_, { source, state }) => {
      expect(getAclState(normalizeAclSource(source))).toBe(state);
    }
  );
});
