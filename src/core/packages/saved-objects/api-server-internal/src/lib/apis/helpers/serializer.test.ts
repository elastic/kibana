/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SavedObjectsSerializer,
  SavedObjectTypeRegistry,
} from '@kbn/core-saved-objects-base-server-internal';
import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import { SerializerHelper } from './serializer';

describe('SerializerHelper', () => {
  const registry = new SavedObjectTypeRegistry();
  registry.registerType({
    name: 'foo',
    hidden: false,
    namespaceType: 'multiple-isolated',
    mappings: { properties: {} },
  });
  const helper = new SerializerHelper({
    registry,
    serializer: new SavedObjectsSerializer(registry),
  });
  const raw: SavedObjectsRawDoc = {
    _id: 'foo:bar',
    _source: {
      type: 'foo',
      foo: {},
      namespaces: ['default'],
      references: [],
      acl: { version: 1, owner: { type: 'user', id: 'u_owner' } },
    },
  };

  describe('#rawToSavedObject', () => {
    it('leaves the ACL out by default', () => {
      expect(helper.rawToSavedObject(raw)).not.toHaveProperty('acl');
    });

    it('returns the ACL when the options set includeAcl', () => {
      expect(helper.rawToSavedObject(raw, { includeAcl: true })).toHaveProperty('acl', {
        version: [1],
        owner: { type: ['user'], id: ['u_owner'] },
        general: { access: [] },
        entries: [],
      });
    });
  });
});
