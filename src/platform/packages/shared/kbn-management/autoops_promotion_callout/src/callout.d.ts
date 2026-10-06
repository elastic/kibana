/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
export declare const AUTOOPS_CALLOUT_DISMISSED_KEY = 'kibana.autoOpsPromotionCallout.dismissed';
export declare const AUTOOPS_ENABLED_CALLOUT_DISMISSED_KEY =
  'kibana.autoOpsEnabledCallout.dismissed';
export interface AutoOpsPromotionCalloutProps {
  cloudConnectUrl?: string;
  docsUrl?: string;
  onConnectClick?: (e: React.MouseEvent) => void;
  hasCloudConnectPermission?: boolean;
  /** When true (default), illustration and content+CTA stack in 2 columns. When false, the CTA moves to a third column. */
  compressed?: boolean;
  style?: React.CSSProperties;
}
export declare const AutoOpsPromotionCallout: ({
  cloudConnectUrl,
  docsUrl,
  onConnectClick,
  hasCloudConnectPermission,
  compressed,
  style,
}: AutoOpsPromotionCalloutProps) => React.JSX.Element;
export interface AutoOpsEnabledCalloutProps {
  /** The URL to the AutoOps service page for this cluster. If absent, the banner is not rendered. */
  autoOpsUrl?: string;
  /** The URL to the AutoOps documentation, shown as an inline "Learn more" link. */
  docsUrl?: string;
  /** When true (default), illustration and content+CTA stack in 2 columns. When false, the CTA moves to a third column. */
  compressed?: boolean;
  style?: React.CSSProperties;
}
export declare const AutoOpsEnabledCallout: ({
  autoOpsUrl,
  docsUrl,
  compressed,
  style,
}: AutoOpsEnabledCalloutProps) => React.JSX.Element | null;
