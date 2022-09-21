/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Path from 'path';

import { REPO_ROOT } from './paths.mjs';

/**
 * @returns {Promise<import('@kbn/bazel-packages').BazelPackage[]>}
 */
export async function packageDiscovery() {
  /* eslint-disable no-unsanitized/method */
  /** @type {import('@kbn/bazel-packages')} */
  const { discoverBazelPackages } = await import(
    Path.join(REPO_ROOT, 'packages/kbn-bazel-packages/index.js')
  );
  /* eslint-enable no-unsanitized/method */

  return await discoverBazelPackages(REPO_ROOT);
}
