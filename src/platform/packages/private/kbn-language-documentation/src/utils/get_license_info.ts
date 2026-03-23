/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { LicenseType } from '@kbn/licensing-types';
import type {
  CommandDefinition,
  FunctionDefinition,
  LicenseInfo,
  MultipleLicenseInfo,
} from '../types';
import { aggregateLicensesFromSignatures } from './aggregate_licenses_from_signatures';

/**
 * Transforms the aggregated license map into the final array of LicenseInfo objects.
 */
function transformLicenseMap(licensesMap: Map<string, Set<string>>): LicenseInfo[] {
  return Array.from(licensesMap.entries()).map(([name, paramsSet]) => {
    const paramsWithLicense = Array.from(paramsSet);
    return {
      name: name.toLowerCase() as LicenseType,
      isSignatureSpecific: paramsWithLicense.length > 0,
      paramsWithLicense,
    };
  });
}

export function getLicenseInfoForFunctions(
  fnDefinition: FunctionDefinition | undefined
): MultipleLicenseInfo | undefined {
  if (!fnDefinition) {
    return undefined;
  }

  // Case 1: A top-level license exists. This takes precedence over all signature-specific licenses.
  if (fnDefinition.license) {
    const licenseInfo: LicenseInfo = {
      name: fnDefinition.license.toLowerCase() as LicenseType,
      isSignatureSpecific: false,
      paramsWithLicense: [],
    };
    return {
      licenses: [licenseInfo],
      hasMultipleLicenses: false,
    };
  }

  // Case 2: Licenses are defined at the signature level.
  const licensesMap = aggregateLicensesFromSignatures(fnDefinition.signatures);

  if (licensesMap.size === 0) {
    return undefined;
  }

  const licenses = transformLicenseMap(licensesMap);

  return {
    licenses,
    hasMultipleLicenses: licenses.length > 1,
  };
}

/**
 * Creates license info structure for commands.
 */
export function getLicenseInfoForCommand(
  commandDef: CommandDefinition | undefined
): MultipleLicenseInfo | undefined {
  if (!commandDef || !commandDef.license) {
    return undefined;
  }

  return {
    licenses: [
      {
        name: commandDef.license.toLowerCase() as LicenseType,
      },
    ],
    hasMultipleLicenses: false,
  };
}
