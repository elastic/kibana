/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { ReactElement } from 'react';
import type { ProfileProviderServices } from '../../profile_provider_services';

const noop = () => {};

export interface EnhancedAlertFlyoutFooterProps extends DocViewRenderProps {
  providerServices: ProfileProviderServices;
  refreshData?: () => void;
  fallbackRenderFooter?: (props: DocViewRenderProps) => ReactElement | undefined;
}

export const EnhancedAlertFlyoutFooter = ({
  hit,
  providerServices,
  refreshData,
  fallbackRenderFooter,
  ...docViewProps
}: EnhancedAlertFlyoutFooterProps) => {
  const alertFlyoutFooterFeature = providerServices.discoverShared.features.registry.getById(
    'security-solution-alert-flyout-footer'
  );
  const handleAlertUpdated = refreshData ?? noop;

  const renderFooter = alertFlyoutFooterFeature?.renderFooter;

  return renderFooter
    ? renderFooter({ hit, ...docViewProps, onAlertUpdated: handleAlertUpdated })
    : fallbackRenderFooter?.({ hit, ...docViewProps }) ?? null;
};
