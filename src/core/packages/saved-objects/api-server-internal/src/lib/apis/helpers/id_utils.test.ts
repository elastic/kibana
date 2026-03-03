/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { assertValidId, FORBIDDEN_ID_CHARS } from './id_utils';

describe('assertValidId', () => {
  describe('valid IDs', () => {
    it.each([
      ['UUID', '550e8400-e29b-41d4-a716-446655440000'],
      ['alphanumeric with dashes', 'my-dashboard-123'],
      ['ID with colons', 'space:type:doc-id'],
      ['ID with dots', 'my.dashboard.id'],
      ['ID with underscores', 'my_dashboard_id'],
    ])('accepts %s', (_label, id) => {
      expect(() => assertValidId(id)).not.toThrow();
    });
  });

  describe('path traversal attacks', () => {
    it.each([
      ['simple path traversal', '../../../etc/passwd'],
      ['leading slash', '/etc/passwd'],
      ['embedded slash', 'valid-prefix/attack-suffix'],
      ['double slash', '//attack'],
      ['slash at end', 'my-id/'],
      ['complex traversal', '../../.kibana/_cluster/state'],
    ])('rejects %s', (_label, id) => {
      expect(() => assertValidId(id)).toThrowError(/Invalid saved object ID/);
    });
  });

  it('error message lists the forbidden character', () => {
    expect(() => assertValidId('path/traversal')).toThrowError("IDs cannot contain '/'");
  });

  it('FORBIDDEN_ID_CHARS contains forward slash', () => {
    expect(FORBIDDEN_ID_CHARS).toContain('/');
  });
});
