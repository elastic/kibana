/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { compare } from 'semver';
import { SerializableState, VersionedState, MigrateFunctionsObject } from './types';

export function migrateToLatest<S extends SerializableState>(
  migrations: MigrateFunctionsObject,
  { state, version: oldVersion }: VersionedState
): VersionedState<S> {
  const versions = Object.keys(migrations || {})
    .filter((v) => compare(v, oldVersion) > 0)
    .sort(compare);

  if (!versions.length) return { state, version: oldVersion } as VersionedState<S>;

  for (const version of versions) {
    state = migrations[version]!(state);
  }

  return {
    state: state as S,
    version: versions[versions.length - 1],
  };
}
