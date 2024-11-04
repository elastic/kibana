/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * since version is saved as a number for BWC reasons, we need to convert the semver version to a number before
 * saving it. For the time being we can just remove the minor and patch version info.
 */
export const convertDashboardVersionToNumber = (dashboardSemver: string) => {
  return +dashboardSemver.split('.')[0];
};

/**
 * since version is saved as a number for BWC reasons, we need to convert the numeric version to a semver version. For the
 * time being we can just convert the numeric version into the MAJOR version of a semver string.
 */
export const convertNumberToDashboardVersion = (numericVersion: number) => `${numericVersion}.0.0`;
