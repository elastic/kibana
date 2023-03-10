/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { validateVersion } from '../../../common/utils';
import type { Version } from '../../../common';

export const validateRequestVersion = (
  requestVersion: Version | undefined,
  latestVersion: Version
): Version => {
  if (requestVersion === undefined) {
    // this should never happen as we have schema in place at the route level
    throw new Error('Request version missing');
  }

  const requestVersionNumber = validateVersion(requestVersion);
  const latestVersionNumber = parseInt(latestVersion.substring(1), 10);

  if (requestVersionNumber > latestVersionNumber) {
    throw new Error(`Invalid version. Latest version is [${latestVersion}].`);
  }

  return requestVersion;
};
