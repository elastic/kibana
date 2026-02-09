/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import semver from 'semver';

export type Distribution = 'stack' | 'serverless';

export interface BaselineSelection {
  distribution: Distribution;
  path: string;
}

export function selectBaseline(
  distribution: Distribution,
  version?: string,
  overridePath?: string
): BaselineSelection {
  if (overridePath) {
    return { distribution, path: overridePath };
  }

  const baselinesDir = resolve(__dirname, '../../baselines');

  if (distribution === 'serverless') {
    return {
      distribution,
      path: resolve(baselinesDir, 'serverless/current.yaml'),
    };
  }

  if (!version) {
    throw new Error('Version is required for stack baseline selection');
  }

  // semver.parse handles SNAPSHOT suffix and pre-release versions automatically
  // Examples: "9.2.0-SNAPSHOT" → { major: 9, minor: 2, ... }
  //           "9.2.0-alpha.1" → { major: 9, minor: 2, ... }
  const parsed = semver.parse(version);
  if (!parsed) {
    throw new Error(
      `Invalid semver version: "${version}". Expected format: X.Y.Z (e.g., "9.2.0" or "9.2.0-SNAPSHOT")`
    );
  }

  // Compare against previous minor version baseline
  // e.g., 9.4.0 compares against 9.3.yaml
  const previousMinor = parsed.minor > 0 ? parsed.minor - 1 : 0;
  const baselineVersion = `${parsed.major}.${previousMinor}`;
  return {
    distribution,
    path: resolve(baselinesDir, `stack/${baselineVersion}.yaml`),
  };
}
