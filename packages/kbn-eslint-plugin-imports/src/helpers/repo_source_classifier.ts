/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ImportResolver } from '@kbn/import-resolver';
import { RepoSourceClassifier } from '@kbn/repo-source-classifier';

const cache = new WeakMap<ImportResolver, RepoSourceClassifier>();

/**
 * Gets the instance of RepoSourceClassifier that should be used. We cache these instances
 * key'd off of ImportResolver instances because the caches maintained by the RepoSourceClassifer
 * should live the same amount of time. Both classes assume that the files on disk are
 * relatively "stable" for the lifetime of the object and once the files are assumed
 * to have change that a new object will be created and the old version with the old
 * caches will be thrown away and garbage collected.
 */
export function getRepoSourceClassifier(resolver: ImportResolver) {
  const cached = cache.get(resolver);
  if (cached) {
    return cached;
  }

  const classifier = new RepoSourceClassifier(resolver);
  cache.set(resolver, classifier);
  return classifier;
}
