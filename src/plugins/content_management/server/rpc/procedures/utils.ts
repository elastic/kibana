/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { validateVersion } from '@kbn/object-versioning/lib/utils';
import type { Version } from '@kbn/object-versioning';

export const validateRequestVersion = (
  requestVersion: Version | undefined,
  latestVersion: Version
): Version => {
  if (requestVersion === undefined) {
    // this should never happen as we have schema in place at the route level
    throw new Error('Request version missing');
  }

  const { result, value: requestVersionNumber } = validateVersion(requestVersion);

  if (!result) {
    throw new Error(`Invalid version [${requestVersion}]. Must be an integer.`);
  }

  if (requestVersionNumber > latestVersion) {
    throw new Error(`Invalid version. Latest version is [${latestVersion}].`);
  }

  return requestVersionNumber;
};
