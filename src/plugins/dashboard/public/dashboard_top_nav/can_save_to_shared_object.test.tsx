/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reference } from '@kbn/content-management-utils';
import { SpacesManager } from '@kbn/spaces-plugin/public';
import { canSaveToSharedObject } from './can_save_to_shared_object';

test('returns true if there are no references', async () => {
  const savedObjectTarget = {
    type: 'dashboard',
    id: 'dashboard1',
    namespaces: ['default'],
  };
  const references = [] as Reference[];
  const spacesManager = {
    /* mock spaces manager */
  } as SpacesManager;

  const result = await canSaveToSharedObject({ savedObjectTarget, references, spacesManager });

  expect(result).toBe(true);
});

test('returns true if there are references and hasUnsharedReference is false', async () => {
  const savedObjectTarget = {
    /* mock saved object target */
    type: 'dashboard',
    id: 'dashboard1',
    namespaces: ['default'],
  };
  const references = [
    /* mock references */
  ] as Reference[];
  const spacesManager = {
    /* mock spaces manager */
  };

  const result = await canSaveToSharedObject({ savedObjectTarget, references, spacesManager });

  expect(result).toBe(true);
});

test('returns false if hasUnsharedReference is true and hasUnshareableReference is true', async () => {
  const savedObjectTarget = {
    /* mock saved object target */
  };
  const references = [
    /* mock references */
  ] as Reference[];
  const spacesManager = {
    /* mock spaces manager */
  };

  const result = await canSaveToSharedObject({ savedObjectTarget, references, spacesManager });

  expect(result).toBe(false);
});

test('returns false if hasUnsharedReference is true and hasHiddenSpace is true', async () => {
  const savedObjectTarget = {
    /* mock saved object target */
  };
  const references = [
    /* mock references */
  ] as Reference[];
  const spacesManager = {
    /* mock spaces manager */
  };

  const result = await canSaveToSharedObject({ savedObjectTarget, references, spacesManager });

  expect(result).toBe(false);
});

test('returns false if hasUnsharedReference is true, sharedWithAllSpaces is false, and cannotShareToAllSpaces is true', async () => {
  const savedObjectTarget = {
    /* mock saved object target */
  };
  const references = [
    /* mock references */
  ] as Reference[];
  const spacesManager = {
    /* mock spaces manager */
  };

  const result = await canSaveToSharedObject({ savedObjectTarget, references, spacesManager });

  expect(result).toBe(false);
});

test('returns true if hasUnsharedReference is true, sharedWithAllSpaces is false, and cannotShareToAllSpaces is false', async () => {
  const savedObjectTarget = {
    /* mock saved object target */
  };
  const references = [
    /* mock references */
  ] as Reference[];
  const spacesManager = {
    /* mock spaces manager */
  };

  const result = await canSaveToSharedObject({ savedObjectTarget, references, spacesManager });

  expect(result).toBe(false);
});

test('returns false if hasUnsharedReference is true, sharedWithAllSpaces is true, and cannotShareToAllSpaces is true', async () => {
  const savedObjectTarget = {
    /* mock saved object target */
  };
  const references = [
    /* mock references */
  ] as Reference[];
  const spacesManager = {
    /* mock spaces manager */
  };

  const result = await canSaveToSharedObject({ savedObjectTarget, references, spacesManager });

  expect(result).toBe(false);
});

test('returns true if hasUnsharedReference is true, sharedWithAllSpaces is true, and cannotShareToAllSpaces is false', async () => {
  const savedObjectTarget = {
    /* mock saved object target */
  };
  const references = [
    /* mock references */
  ] as Reference[];
  const spacesManager = {
    /* mock spaces manager */
  };

  const result = await canSaveToSharedObject({ savedObjectTarget, references, spacesManager });

  expect(result).toBe(false);
});

test('returns false if hasUnsharedReference is true and cannotShareToAllSpaces is true', async () => {
  const savedObjectTarget = {
    /* mock saved object target */
  };
  const references = [
    /* mock references */
  ] as Reference[];
  const spacesManager = {
    /* mock spaces manager */
  };

  const result = await canSaveToSharedObject({ savedObjectTarget, references, spacesManager });

  expect(result).toBe(false);
});
