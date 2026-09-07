/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIllustration, EuiSpacer } from '@elastic/eui';
import { cloudRocketDeploy } from '@elastic/eui-illustrations';
import { AnnouncementBanner } from '@kbn/announcement-banner';
import * as i18n from '../translations';
import { useKibana } from '../hooks/use_kibana';
import { useShowEisPromotionalContent } from '../hooks/use_show_eis_promotional_content';

export interface EisCloudConnectPromoCalloutProps {
  promoId: string;
  isSelfManaged: boolean;
  navigateToApp: () => void;
  addSpacer?: 'top' | 'bottom';
}

export const EisCloudConnectPromoCallout = ({
  promoId,
  isSelfManaged,
  navigateToApp,
  addSpacer,
}: EisCloudConnectPromoCalloutProps) => {
  const {
    services: { application },
  } = useKibana();
  const { isPromoVisible, onDismissPromo } = useShowEisPromotionalContent({
    promoId: `${promoId}CloudConnectCallout`,
  });

  const hasCloudConnectPermission = Boolean(
    application.capabilities.cloudConnect?.show || application.capabilities.cloudConnect?.configure
  );

  const dataId = `${promoId}-cloud-connect-callout`;

  if (!isPromoVisible || !isSelfManaged || !hasCloudConnectPermission) {
    return null;
  }

  return (
    <>
      {addSpacer === 'top' && <EuiSpacer size="l" />}
      <AnnouncementBanner
        data-test-subj={dataId}
        data-telemetry-id={dataId}
        title={i18n.EIS_CALLOUT_TITLE}
        text={i18n.EIS_CLOUD_CONNECT_PROMO_DESCRIPTION}
        media={<EuiIllustration type={cloudRocketDeploy} alt="" />}
        color="highlighted"
        onDismiss={onDismissPromo}
        actionProps={{
          primary: {
            children: i18n.EIS_CLOUD_CONNECT_PROMO_TOUR_CTA,
            iconType: 'external',
            iconSide: 'right',
            onClick: navigateToApp,
            'data-test-subj': 'eisUpdateCalloutCtaBtn',
            'data-telemetry-id': `${dataId}-connectYourCluster-btn`,
          },
        }}
      />
      {addSpacer === 'bottom' && <EuiSpacer size="l" />}
    </>
  );
};
