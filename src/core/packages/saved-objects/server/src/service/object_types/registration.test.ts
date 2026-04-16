/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { typeRegistryMock } from '../../../mocks';
import { LEGACY_URL_ALIAS_TYPE } from '../../base';
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
