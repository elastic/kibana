/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ACL_FIELD_PATHS, matchesAclField } from './acl_field';

describe('matchesAclField', () => {
  it('knows every field of the ACL mapping', () => {
    expect(ACL_FIELD_PATHS).toEqual([
      'acl',
      'acl.version',
      'acl.owner',
      'acl.owner.type',
      'acl.owner.id',
      'acl.general',
      'acl.general.access',
      'acl.entries',
      'acl.entries.type',
      'acl.entries.id',
      'acl.entries.access',
      'acl.entries.added_at',
    ]);
  });

  it.each([
    'acl',
    'acl.owner.id',
    'acl.general.access',
    'acl.entries.added_at',
    // Unmapped keys under `acl` are still part of it.
    'acl.unknown',
    '*',
    'a*',
    'acl*',
    'acl.*',
    '*.access',
    '*owner*',
    '**',
    'acl.*.id',
    'acl.entries.*',
    'a*l.o*r.*d',
  ])('matches %s', (pattern) => {
    expect(matchesAclField(pattern)).toBe(true);
  });

  it.each([
    'aclx',
    'accessControl',
    'accessControl.owner',
    'updated_at',
    'b*',
    '*.title',
    'dashboard.acl',
    'title*',
    '*x',
    '*.attributes.*',
    'acl*x',
  ])('does not match %s', (pattern) => {
    expect(matchesAclField(pattern)).toBe(false);
  });

  it('answers quickly for a pattern with many wildcards', () => {
    expect(matchesAclField(`${'*'.repeat(1000)}x`)).toBe(false);
    expect(matchesAclField(`${'*'.repeat(1000)}id`)).toBe(true);
  });
});
