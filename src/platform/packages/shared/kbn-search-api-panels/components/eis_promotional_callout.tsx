/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIllustration } from '@elastic/eui';
import { cloudRocketDeploy } from '@elastic/eui-illustrations';
import { AnnouncementBanner } from '@kbn/announcement-banner';
import {
  EIS_CALLOUT_DOCUMENTATION_BTN,
  EIS_PROMO_CALLOUT_DESCRIPTION,
  EIS_CALLOUT_TITLE,
} from '../translations';
import { useShowEisPromotionalContent } from '../hooks/use_show_eis_promotional_content';

export interface EisPromotionalCalloutProps {
  ctaLink: string;
  promoId: string;
  isCloudEnabled: boolean;
}

export const EisPromotionalCallout = ({
  ctaLink,
  promoId,
  isCloudEnabled,
}: EisPromotionalCalloutProps) => {
  const { isPromoVisible, onDismissPromo } = useShowEisPromotionalContent({
    promoId: `${promoId}EisPromoCallout`,
  });

  const dataId = `${promoId}-eis-promo-callout`;

  if (!isPromoVisible || !isCloudEnabled) {
    return null;
  }

  return (
    <AnnouncementBanner
      data-test-subj={dataId}
      title={EIS_CALLOUT_TITLE}
      text={EIS_PROMO_CALLOUT_DESCRIPTION}
      media={<EuiIllustration type={cloudRocketDeploy} alt="" />}
      color="highlighted"
      onDismiss={onDismissPromo}
      actionProps={{
        primary: {
          children: EIS_CALLOUT_DOCUMENTATION_BTN,
          href: ctaLink,
          target: '_blank',
          iconType: 'external',
          iconSide: 'right',
          'data-test-subj': 'eisPromoCalloutCtaBtn',
          'data-telemetry-id': `${dataId}-viewEisDocs-link`,
        },
      }}
    />
  );
};
