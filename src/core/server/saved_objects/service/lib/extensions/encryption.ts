/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObject } from '../../../types';

export interface ISavedObjectsEncryptionExtension {
  isEncryptableType: (type: string) => boolean;
  decryptOrStripResponseAttributes: <T, R extends SavedObject<T>>(
    response: R,
    originalAttributes?: T
  ) => Promise<R>;
  encryptAttributes: <T extends Record<string, unknown>>(
    descriptor: { id: string; type: string; namespace: string | undefined },
    attributes: T
  ) => Promise<T>;
}
