/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { useCallback } from 'react';
import type { ReactElement } from 'react';
import type { ProfileProviderServices } from '../../profile_provider_services';
import { useCurrentTabDataStateContainer } from '../../../../application/main/state_management/redux';

export interface EnhancedAlertFlyoutFooterProps extends DocViewRenderProps {
  providerServices: ProfileProviderServices;
  fallbackRenderFooter?: (props: DocViewRenderProps) => ReactElement | undefined;
}

export const EnhancedAlertFlyoutFooter = ({
  hit,
  providerServices,
  fallbackRenderFooter,
  ...docViewProps
}: EnhancedAlertFlyoutFooterProps) => {
  const dataStateContainer = useCurrentTabDataStateContainer();
  const alertFlyoutFooterFeature = providerServices.discoverShared.features.registry.getById(
    'security-solution-alert-flyout-footer'
  );

  const renderFooter = alertFlyoutFooterFeature?.renderFooter;
  const onAlertUpdated = useCallback(() => {
    dataStateContainer.refetch$.next(undefined);
  }, [dataStateContainer]);

  return renderFooter
    ? renderFooter({ hit, ...docViewProps, onAlertUpdated })
    : fallbackRenderFooter?.({ hit, ...docViewProps }) ?? null;
};
