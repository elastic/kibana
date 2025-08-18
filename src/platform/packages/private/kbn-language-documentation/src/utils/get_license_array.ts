/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LicenseInfo, MultipleLicenseInfo } from '../types';

// Helper function to get licenses array from either format

export function getLicensesArray(license: MultipleLicenseInfo | undefined): LicenseInfo[] {
  if (license && Array.isArray(license.licenses)) {
    return license.licenses;
  }
  return [];
}
