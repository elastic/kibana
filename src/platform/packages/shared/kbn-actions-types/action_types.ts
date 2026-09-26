/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LicenseType } from '@kbn/licensing-types';

export enum ACTION_TYPE_SOURCES {
  spec = 'spec',
  yml = 'yml',
  stack = 'stack',
}
export type ActionTypeSource = keyof typeof ACTION_TYPE_SOURCES;

export enum SUB_FEATURE {
  endpointSecurity,
}
export type SubFeature = keyof typeof SUB_FEATURE;

export interface ActionType {
  id: string;
  name: string;
  enabled: boolean;
  enabledInConfig: boolean;
  enabledInLicense: boolean;
  minimumLicenseRequired: LicenseType;
  supportedFeatureIds: string[];
  isSystemActionType: boolean;
  source?: ActionTypeSource;
  subFeature?: SubFeature;
  isDeprecated: boolean;
  allowMultipleSystemActions?: boolean;
  description?: string;
  isExperimental?: boolean;
  isTestable?: boolean;
  /** Action names from a spec-sourced connector type; omitted for classic connectors. */
  subActions?: string[];
  /** Spec metadata icon: EUI icon name or data/HTTP URL. */
  icon?: string;
  /** Accepted latest spec version of the newest major; omitted for classic connectors. */
  specVersion?: string;
  /** Accepted latest spec version per major; omitted for classic connectors. */
  specVersions?: Record<string, string>;
}

export type ConnectorUserAuthStatus = 'connected' | 'not_connected' | 'not_applicable';

export type ConnectorAuthStatusMap = Record<string, { userAuthStatus: ConnectorUserAuthStatus }>;
