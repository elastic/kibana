/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LicenseType } from '@kbn/licensing-types';

export interface ConnectorMetadata {
  id: string;
  displayName: string;
  icon?: string;
  description: string;
  /**
   * Documentation URL for this connector type. Set it when the id-based derivation
   * wouldn't resolve to the published page (e.g. a differing slug or a third-party site).
   * Use an empty string when the connector has no dedicated page: it resolves to the
   * connectors index via the doc-links service. When omitted, the URL is derived from
   * the connector id.
   */
  docsUrl?: string;
  minimumLicense: LicenseType;
  isTechnicalPreview?: boolean;
  supportedFeatureIds: Array<
    | 'alerting'
    | 'cases'
    | 'uptime'
    | 'siem'
    | 'generativeAIForSecurity'
    | 'generativeAIForObservability'
    | 'generativeAIForSearchPlayground'
    | 'endpointSecurity'
    | 'workflows'
    | 'agentBuilder'
    | 'contextEngine'
  >;
}
