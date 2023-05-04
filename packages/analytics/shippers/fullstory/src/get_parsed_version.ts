/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function getParsedVersion(version: string): {
  version_str: string;
  version_major_int: number;
  version_minor_int: number;
  version_patch_int: number;
} {
  const [major, minor, patch] = version.split('.');
  return {
    version_str: version,
    version_major_int: parseInt(major, 10),
    version_minor_int: parseInt(minor, 10),
    version_patch_int: parseInt(patch, 10),
  };
}
