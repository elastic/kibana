/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import KbnServer from '../legacy/server/kbn_server';

export type NpUiPluginPublicDirs = Array<{
  id: string;
  path: string;
}>;

export function getNpUiPluginPublicDirs(kbnServer: KbnServer): NpUiPluginPublicDirs {
  return Array.from(kbnServer.newPlatform.__internals.uiPlugins.internal.entries()).map(
    ([id, { publicTargetDir }]) => ({
      id,
      path: publicTargetDir,
    })
  );
}

export function isNpUiPluginPublicDirs(x: any): x is NpUiPluginPublicDirs {
  return (
    Array.isArray(x) &&
    x.every(
      (s) => typeof s === 'object' && s && typeof s.id === 'string' && typeof s.path === 'string'
    )
  );
}

export function assertIsNpUiPluginPublicDirs(x: any): asserts x is NpUiPluginPublicDirs {
  if (!isNpUiPluginPublicDirs(x)) {
    throw new TypeError(
      'npUiPluginPublicDirs must be an array of objects with string `id` and `path` properties'
    );
  }
}
