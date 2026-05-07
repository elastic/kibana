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

export interface EnhancedAlertFlyoutHeaderProps extends DocViewRenderProps {
  providerServices: ProfileProviderServices;
  refreshData?: () => void;
  fallbackRenderHeader?: (props: DocViewRenderProps) => ReactElement | undefined;
}

export const EnhancedAlertFlyoutHeader = ({
  hit,
  providerServices,
  refreshData,
  fallbackRenderHeader,
  ...docViewProps
}: EnhancedAlertFlyoutHeaderProps) => {
  const alertFlyoutHeaderFeature = providerServices.discoverShared.features.registry.getById(
    'security-solution-alert-flyout-header-title'
  );
  const handleAlertUpdated = refreshData ?? noop;

  const renderHeader = alertFlyoutHeaderFeature?.renderHeader;

  return renderHeader
    ? renderHeader({ hit, ...docViewProps, onAlertUpdated: handleAlertUpdated })
    : fallbackRenderHeader?.({ hit, ...docViewProps }) ?? null;
};
