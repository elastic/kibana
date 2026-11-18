/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StoredAcl } from '@kbn/ols';
import { projectAcl } from './acl';

describe('projectAcl', () => {
  const acl = {
    version: [1],
    owner: { type: ['user'], id: ['u_owner'] },
    general: { access: ['none'] },
    entries: [],
  };

  it('leaves the ACL out by default', () => {
    expect(projectAcl({ id: 'a', acl })).toEqual({ id: 'a' });
  });

  it('keeps the ACL when the caller asks for it', () => {
    expect(projectAcl({ id: 'a', acl }, true)).toEqual({ id: 'a', acl });
  });

  it('returns an object without an ACL unchanged', () => {
    const object: { id: string; acl?: StoredAcl } = { id: 'a' };
    expect(projectAcl(object)).toBe(object);
  });
});
