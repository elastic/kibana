/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ILicense, LicenseType } from '@kbn/licensing-types';

/** The minimum required license type for Workflows. */
export const REQUIRED_LICENSE_TYPE: LicenseType = 'enterprise';

export function isLicenseValid(license: ILicense): boolean {
  return license.isActive && license.hasAtLeast(REQUIRED_LICENSE_TYPE);
}
