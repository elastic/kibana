/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FIXTURE_POLICY, type AclObjectDecision } from '@kbn/access-control';
import { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
import { SavedObjectsErrorHelpers, getAclObjectKey } from '@kbn/core-saved-objects-server';
import { savedObjectsExtensionsMock } from '../../../mocks/saved_objects_extensions.mock';
import { AclHelper } from './acl';

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

const PRIVATE_SOURCE = {
  type: ACL_TYPE,
  acl: { version: 1, owner: { type: 'user', id: 'u_owner' }, general_access: 'none', entries: [] },
};

describe('AclHelper', () => {
  let registry: SavedObjectTypeRegistry;
  let aclExtension: ReturnType<typeof savedObjectsExtensionsMock.createAclExtension>;
  let helper: AclHelper;

  beforeEach(() => {
    registry = createRegistry();
    aclExtension = savedObjectsExtensionsMock.createAclExtension();
    helper = new AclHelper({ registry, aclExtension });
  });

  describe('#isEnforced', () => {
    it('is enforced only for types with an access policy', () => {
      expect(helper.isEnforced(ACL_TYPE)).toBe(true);
      expect(helper.isEnforced(OTHER_TYPE)).toBe(false);
      expect(helper.isEnforced('unknown')).toBe(false);
    });

    it('is never enforced without an extension', () => {
      expect(new AclHelper({ registry }).isEnforced(ACL_TYPE)).toBe(false);
    });
  });

  describe('#rejectUnsupported', () => {
    it('throws a bad request for an enforced type', () => {
      expect(() => helper.rejectUnsupported([OTHER_TYPE, ACL_TYPE], 'search')).toThrowError(
        `search is not supported for type ${ACL_TYPE}, which has an access policy`
      );
      try {
        helper.rejectUnsupported([ACL_TYPE], 'search');
      } catch (error) {
        expect(SavedObjectsErrorHelpers.isBadRequestError(error)).toBe(true);
      }
    });

    it('does not throw for unregistered types or without an extension', () => {
      expect(() => helper.rejectUnsupported([OTHER_TYPE], 'search')).not.toThrow();
      expect(() =>
        new AclHelper({ registry }).rejectUnsupported([ACL_TYPE], 'search')
      ).not.toThrow();
    });
  });

  describe('#authorize', () => {
    it('never sends unregistered types to the extension', async () => {
      const decisions = await helper.authorize('view', undefined, [{ type: OTHER_TYPE, id: '1' }]);
      expect(decisions.size).toBe(0);
      expect(aclExtension.authorizeObjects).not.toHaveBeenCalled();
    });

    it('allows everything without an extension', async () => {
      const decisions = await new AclHelper({ registry }).authorize('view', undefined, [
        { type: ACL_TYPE, id: '1', source: PRIVATE_SOURCE },
      ]);
      expect(decisions.size).toBe(0);
    });

    it('decides objects per namespace with their normalized ACL', async () => {
      aclExtension.authorizeObjects.mockImplementation(async ({ objects }) => {
        return new Map(
          objects.map(({ type, id }) => [
            getAclObjectKey(type, id),
            { status: 'not_found' } as AclObjectDecision,
          ])
        );
      });

      const decisions = await helper.authorize('edit', 'space-a', [
        { type: ACL_TYPE, id: '1', source: PRIVATE_SOURCE },
        { type: OTHER_TYPE, id: '2' },
        { type: ACL_TYPE, id: '3', namespace: 'space-b' },
        { type: ACL_TYPE, id: '4' },
      ]);

      expect(aclExtension.authorizeObjects).toHaveBeenCalledTimes(2);
      expect(aclExtension.authorizeObjects).toHaveBeenNthCalledWith(1, {
        operation: 'edit',
        namespace: 'space-a',
        objects: [
          {
            type: ACL_TYPE,
            id: '1',
            acl: {
              version: [1],
              owner: { type: ['user'], id: ['u_owner'] },
              general_access: ['none'],
              entries: [],
            },
          },
          { type: ACL_TYPE, id: '4', acl: undefined },
        ],
      });
      expect(aclExtension.authorizeObjects).toHaveBeenNthCalledWith(2, {
        operation: 'edit',
        namespace: 'space-b',
        objects: [{ type: ACL_TYPE, id: '3', acl: undefined }],
      });
      expect([...decisions.keys()]).toEqual([
        getAclObjectKey(ACL_TYPE, '1'),
        getAclObjectKey(ACL_TYPE, '4'),
        getAclObjectKey(ACL_TYPE, '3'),
      ]);
    });
  });

  describe('#getError', () => {
    const object = { type: ACL_TYPE, id: '1' };
    const decisionsWith = (decision: AclObjectDecision) =>
      new Map([[getAclObjectKey(ACL_TYPE, '1'), decision]]);

    it('returns nothing for allowed or undecided objects', () => {
      expect(helper.getError(new Map(), object)).toBeUndefined();
      expect(helper.getError(decisionsWith({ status: 'allowed' }), object)).toBeUndefined();
    });

    it('reports an object the caller cannot view as a generic not found error', () => {
      const error = helper.getError(decisionsWith({ status: 'not_found' }), object);
      expect(error).toEqual(SavedObjectsErrorHelpers.createGenericNotFoundError(ACL_TYPE, '1'));
      expect(SavedObjectsErrorHelpers.isNotFoundError(error!)).toBe(true);
    });

    it('reports a forbidden operation as a 403 naming the operation', () => {
      const error = helper.getError(
        decisionsWith({ status: 'forbidden', operation: 'edit' }),
        object
      );
      expect(SavedObjectsErrorHelpers.isForbiddenError(error!)).toBe(true);
      expect(error!.message).toBe(`Unable to edit ${ACL_TYPE}: missing "edit" permission`);
    });
  });

  describe('#enforce', () => {
    it('throws the error of a denied object', async () => {
      aclExtension.authorizeObjects.mockResolvedValue(
        new Map([[getAclObjectKey(ACL_TYPE, '1'), { status: 'not_found' }]])
      );
      await expect(
        helper.enforce('view', undefined, { type: ACL_TYPE, id: '1' })
      ).rejects.toMatchObject({ output: { statusCode: 404 } });
    });

    it('does not throw for an allowed object', async () => {
      await expect(
        helper.enforce('view', undefined, { type: ACL_TYPE, id: '1' })
      ).resolves.toBeUndefined();
    });
  });

  describe('#getInitialAcl', () => {
    it('returns the extension result for an enforced type in the canonical form', async () => {
      aclExtension.getInitialAcl.mockResolvedValue({
        version: 1,
        owner: { type: 'user', id: 'u_owner' },
        general_access: 'none',
        entries: [],
      });
      const requested = { general_access: 'none' as const };

      await expect(helper.getInitialAcl(ACL_TYPE, 'space-a', requested)).resolves.toEqual({
        version: [1],
        owner: { type: ['user'], id: ['u_owner'] },
        general_access: ['none'],
        entries: [],
      });
      expect(aclExtension.getInitialAcl).toHaveBeenCalledWith({
        type: ACL_TYPE,
        namespace: 'space-a',
        requested,
      });
    });

    it('rejects requested access for an unregistered type with a bad request', async () => {
      await expect(
        helper.getInitialAcl(OTHER_TYPE, undefined, { general_access: 'none' })
      ).rejects.toMatchObject({
        message: expect.stringContaining(
          `Type ${OTHER_TYPE} does not support object-level access control`
        ),
        output: { statusCode: 400 },
      });
      await expect(
        new AclHelper({ registry }).getInitialAcl(ACL_TYPE, undefined, { general_access: 'none' })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(aclExtension.getInitialAcl).not.toHaveBeenCalled();
    });

    it('returns nothing for an unregistered type without requested access', async () => {
      await expect(helper.getInitialAcl(OTHER_TYPE, undefined)).resolves.toBeUndefined();
      expect(aclExtension.getInitialAcl).not.toHaveBeenCalled();
    });
  });

  describe('#authorizeChange', () => {
    it('passes the normalized ACL to the extension', async () => {
      const result = {
        next: { version: 1 as const, general_access: 'edit' as const, entries: [] },
        warnings: [],
      };
      aclExtension.authorizeAclChange.mockResolvedValue(result);
      const change = { kind: 'claim' as const };

      await expect(
        helper.authorizeChange(
          'space-a',
          { type: ACL_TYPE, id: '1', source: PRIVATE_SOURCE },
          change
        )
      ).resolves.toBe(result);
      expect(aclExtension.authorizeAclChange).toHaveBeenCalledWith({
        namespace: 'space-a',
        object: {
          type: ACL_TYPE,
          id: '1',
          acl: expect.objectContaining({ general_access: ['none'] }),
        },
        change,
      });
    });

    it('rejects an unregistered type with a bad request', async () => {
      await expect(
        helper.authorizeChange(undefined, { type: OTHER_TYPE, id: '1' }, { kind: 'claim' })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(aclExtension.authorizeAclChange).not.toHaveBeenCalled();
    });
  });

  describe('#getReadFilters', () => {
    it('asks the extension for enforced types only', async () => {
      const filter = { match_all: {} };
      aclExtension.getReadFilters.mockResolvedValue(new Map([[ACL_TYPE, filter]]));

      const filters = await helper.getReadFilters(
        new Map([
          [ACL_TYPE, ['default']],
          [OTHER_TYPE, ['default']],
        ])
      );

      expect(filters).toEqual(new Map([[ACL_TYPE, filter]]));
      expect(aclExtension.getReadFilters).toHaveBeenCalledWith({
        namespacesByType: new Map([[ACL_TYPE, ['default']]]),
      });
    });

    it('does not call the extension when no type is enforced', async () => {
      await expect(helper.getReadFilters(new Map([[OTHER_TYPE, ['default']]]))).resolves.toEqual(
        new Map()
      );
      expect(aclExtension.getReadFilters).not.toHaveBeenCalled();
    });
  });

  describe('#runInAuditScope', () => {
    it('delegates to the extension', async () => {
      const operation = jest.fn().mockResolvedValue('result');
      await expect(helper.runInAuditScope(operation)).resolves.toBe('result');
      expect(aclExtension.runInAuditScope).toHaveBeenCalledWith(operation);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('runs the operation directly without an extension', async () => {
      const operation = jest.fn().mockResolvedValue('result');
      await expect(new AclHelper({ registry }).runInAuditScope(operation)).resolves.toBe('result');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
});
