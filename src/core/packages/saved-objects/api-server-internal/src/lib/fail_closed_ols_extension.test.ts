/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildAclReadFilter, normalizeAclSource, prepareInitialAcl } from '@kbn/ols';
import { FIXTURE_POLICY } from '@kbn/ols/src/__fixtures__';
import { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
import { getOlsObjectKey } from '@kbn/core-saved-objects-server';
import { createFailClosedOlsExtension } from './fail_closed_ols_extension';

jest.mock('@kbn/ols', () => {
  const actual = jest.requireActual('@kbn/ols');
  return { ...actual, prepareInitialAcl: jest.fn(actual.prepareInitialAcl) };
});

const ACL_TYPE = 'acl-type';
const OTHER_TYPE = 'other-type';

const createRegistry = () => {
  const registry = new SavedObjectTypeRegistry();
  registry.registerType({
    name: ACL_TYPE,
    hidden: false,
    namespaceType: 'multiple-isolated',
    mappings: { properties: {} },
    accessPolicy: FIXTURE_POLICY,
  });
  registry.registerType({
    name: OTHER_TYPE,
    hidden: false,
    namespaceType: 'multiple-isolated',
    mappings: { properties: {} },
  });
  return registry;
};

const aclWith = (generalAccess: string) =>
  normalizeAclSource({
    acl: {
      version: 1,
      owner: { type: 'user', id: 'u_owner' },
      general: { access: generalAccess },
      entries: [],
    },
  });

describe('createFailClosedOlsExtension', () => {
  const extension = createFailClosedOlsExtension(createRegistry());

  it('reports that OLS is enforced, because it is not the disabled state', () => {
    expect(extension.enabled).toBe(true);
  });

  describe('#authorizeObjects', () => {
    it('hides restricted objects, allows objects without an ACL, and forbids edits of objects others can only use', async () => {
      const decisions = await extension.authorizeObjects({
        operation: 'edit',
        objects: [
          { type: ACL_TYPE, id: 'private', acl: aclWith('none') },
          { type: ACL_TYPE, id: 'absent' },
          { type: ACL_TYPE, id: 'run-only', acl: aclWith('use') },
          { type: OTHER_TYPE, id: 'other' },
        ],
      });

      expect(decisions).toEqual(
        new Map([
          [getOlsObjectKey(ACL_TYPE, 'private'), { status: 'not_found' }],
          [getOlsObjectKey(ACL_TYPE, 'absent'), { status: 'allowed' }],
          [getOlsObjectKey(ACL_TYPE, 'run-only'), { status: 'forbidden', operation: 'edit' }],
        ])
      );
    });

    it('does not let the owner through, because it knows no principal', async () => {
      const decisions = await extension.authorizeObjects({
        operation: 'view',
        objects: [{ type: ACL_TYPE, id: 'private', acl: aclWith('none') }],
      });
      expect(decisions.get(getOlsObjectKey(ACL_TYPE, 'private'))).toEqual({
        status: 'not_found',
      });
    });
  });

  describe('#getReadFilters', () => {
    it('returns a general access filter for types with a policy only', async () => {
      const filters = await extension.getReadFilters({
        namespacesByType: new Map([
          [ACL_TYPE, ['default', 'space-a']],
          [OTHER_TYPE, ['default']],
        ]),
      });

      expect([...filters.keys()]).toEqual([ACL_TYPE]);
      expect(filters.get(ACL_TYPE)).toEqual(
        buildAclReadFilter({
          policy: FIXTURE_POLICY,
          access: 'view',
          recoverySpaces: [],
          ordinarySpaces: ['default', 'space-a'],
        })
      );
    });
  });

  describe('#getInitialAcl', () => {
    it('refuses to restrict a new object', async () => {
      await expect(
        extension.getInitialAcl({
          type: ACL_TYPE,
          id: 'new',
          requested: { general: { access: 'none' } },
        })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      await expect(
        extension.getInitialAcl({
          type: ACL_TYPE,
          id: 'new',
          requested: { entries: [{ type: 'user', id: 'u_grantee', access: 'use' }] },
        })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
    });

    it('creates objects without an ACL otherwise', async () => {
      await expect(extension.getInitialAcl({ type: ACL_TYPE, id: 'new' })).resolves.toBeUndefined();
      await expect(
        extension.getInitialAcl({
          type: ACL_TYPE,
          id: 'new',
          requested: { general: { access: 'edit' } },
        })
      ).resolves.toBeUndefined();
      await expect(
        extension.getInitialAcl({ type: OTHER_TYPE, id: 'new' })
      ).resolves.toBeUndefined();
    });

    it('rethrows errors other than a refused request', async () => {
      const bug = new TypeError('unexpected');
      jest.mocked(prepareInitialAcl).mockImplementationOnce(() => {
        throw bug;
      });

      await expect(extension.getInitialAcl({ type: ACL_TYPE, id: 'new' })).rejects.toBe(bug);
    });
  });

  describe('#authorizeAclChange', () => {
    it('always refuses access changes', async () => {
      await expect(
        extension.authorizeAclChange({ type: ACL_TYPE, id: 'absent', change: { kind: 'claim' } })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
    });
  });
});
