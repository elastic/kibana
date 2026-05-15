/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { ProfileProviderServices } from '../../profile_provider_services';

export interface EnhancedIOCOverviewProps extends DocViewRenderProps {
  providerServices: ProfileProviderServices;
}

export const EnhancedIOCOverview = ({
  hit,
  providerServices,
  ...docViewProps
}: EnhancedIOCOverviewProps) => {
  const iocFlyoutOverviewTabFeature = providerServices.discoverShared.features.registry.getById(
    'security-solution-ioc-flyout-overview-tab'
  );

  const render = iocFlyoutOverviewTabFeature?.render;
  return render ? render({ hit, ...docViewProps }) : null;
};
