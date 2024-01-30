/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface CanUnlinkFromLibrary {
  canUnlinkFromLibrary: () => Promise<boolean>;
  unlinkFromLibrary: () => Promise<void>;
}

export const apiCanUnlinkFromLibrary = (api: unknown): api is CanUnlinkFromLibrary =>
  typeof (api as CanUnlinkFromLibrary).canUnlinkFromLibrary === 'function' &&
  typeof (api as CanUnlinkFromLibrary).unlinkFromLibrary === 'function';
