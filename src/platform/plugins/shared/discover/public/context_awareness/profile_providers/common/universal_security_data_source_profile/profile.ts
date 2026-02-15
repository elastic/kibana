/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataSourceProfileProvider } from '../../../profiles';
import { DataSourceCategory, SolutionType } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';
import {
  createGetDefaultAppState,
  getRowIndicatorProvider,
  getPaginationConfig,
  getColumnsConfiguration,
} from './accessors';
import { extractIndexPatternFrom } from '../../extract_index_pattern_from';

export type UniversalSecurityDataSourceProfileProvider = DataSourceProfileProvider;

const UNIVERSAL_SECURITY_DATA_SOURCE_PROFILE_ID = 'universal-security-data-source-profile';

/**
 * Security index patterns for detection
 */
const SECURITY_INDEX_PATTERNS = [
  '.alerts-security.alerts-*',  // Security alerts
  'logs-endpoint.*',             // Endpoint Security
  'logs-windows.*',              // Windows events
  'logs-system.security*',       // System security logs
  'logs-system.auth*',           // Authentication logs
  'logs-aws.cloudtrail*',        // AWS CloudTrail
  'logs-azure.*',                // Azure logs
  'logs-gcp.audit*',             // GCP audit
  'logs-o365.audit*',            // Office 365
  'logs-network_traffic.*',      // Network traffic
  'logs-zeek.*',                 // Zeek network
  'logs-suricata.*',             // Suricata IDS
  'auditbeat-*',                 // Audit logs
  'winlogbeat-*',                // Windows event logs
];

/**
 * Check if an index pattern matches known security patterns
 */
function isSecurityIndexPattern(pattern: string): boolean {
  return SECURITY_INDEX_PATTERNS.some(secPattern => {
    const regexPattern = secPattern.replace(/\*/g, '.*').replace(/\./g, '\\.');
    return new RegExp(`^${regexPattern}$`).test(pattern);
  });
}

/**
 * Creates the universal security data source profile provider
 * Works across all solutions EXCEPT Security (fallback pattern)
 */
export const createUniversalSecurityDataSourceProfileProvider = (
  services: ProfileProviderServices
): UniversalSecurityDataSourceProfileProvider => {
  const provider = {
    profileId: UNIVERSAL_SECURITY_DATA_SOURCE_PROFILE_ID,
    profile: {
      getDefaultAppState: createGetDefaultAppState(),
      getRowIndicatorProvider,
      getPaginationConfig,
      getColumnsConfiguration,
    },
    resolve: (params) => {
      // Fallback pattern: Don't activate in Security solution
      // (let Security solution profiles handle it)
      if (params.rootContext?.solutionType === SolutionType.Security) {
        return { isMatch: false };
      }

      const indexPattern = extractIndexPatternFrom(params);

      // Check if this is a security data source
      if (!isSecurityIndexPattern(indexPattern)) {
        return { isMatch: false };
      }

      return {
        isMatch: true,
        context: {
          category: DataSourceCategory.Security,
        },
      };
    },
  };

  return provider;
};
