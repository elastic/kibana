/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-browser';
import { SimpleSavedObjectImpl } from '@kbn/core-saved-objects-browser-internal';
import type { SavedObject } from '@kbn/core-saved-objects-common';

const createSimpleSavedObjectMock = (
  client: SavedObjectsClientContract,
  savedObject: SavedObject<unknown>
) => new SimpleSavedObjectImpl(client, savedObject);

export const simpleSavedObjectMock = {
  create: createSimpleSavedObjectMock,
};
