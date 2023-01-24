/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { typeRegistryMock } from '@kbn/core-saved-objects-base-server-mocks';
import { LEGACY_URL_ALIAS_TYPE } from '@kbn/core-saved-objects-base-server-internal';
import { registerCoreObjectTypes } from './registration';

describe('Core saved object types registration', () => {
  describe('#registerCoreObjectTypes', () => {
    it('registers all expected types', () => {
      const typeRegistry = typeRegistryMock.create();
      registerCoreObjectTypes(typeRegistry);

      expect(typeRegistry.registerType).toHaveBeenCalledTimes(1);
      expect(typeRegistry.registerType).toHaveBeenCalledWith(
        expect.objectContaining({ name: LEGACY_URL_ALIAS_TYPE })
      );
    });
  });
});
