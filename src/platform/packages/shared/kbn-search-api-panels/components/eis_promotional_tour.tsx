/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  EuiTourStep,
  useEuiTheme,
  type EuiTourStepProps,
} from '@elastic/eui';
import {
  TOUR_DISMISS,
  TOUR_CTA,
  EIS_PROMO_TOUR_DESCRIPTION,
  EIS_PROMO_TOUR_TITLE,
} from '../translations';
import { useShowEisPromotionalContent } from '../hooks/use_show_eis_promotional_content';
import { useKibana } from '../hooks/use_kibana';

export interface EisPromotionalTourProps {
  anchorPosition?: EuiTourStepProps['anchorPosition'];
  ctaLink?: string;
  promoId: string;
  isCloudEnabled: boolean;
  children: React.ReactElement;
}

export const EisPromotionalTour = ({
  anchorPosition = 'downCenter',
  ctaLink,
  promoId,
  isCloudEnabled,
  children,
}: EisPromotionalTourProps) => {
  const { euiTheme } = useEuiTheme();
  const { isPromoVisible, onDismissPromo } = useShowEisPromotionalContent({
    promoId: `${promoId}EisPromoTour`,
  });
  const dataId = `${promoId}-eis-promo-tour`;
  const {
    services: { notifications },
  } = useKibana();
  const isTourEnabled = notifications?.tours?.isEnabled() ?? true;

  if (!isPromoVisible || !isCloudEnabled || !isTourEnabled) {
    return children;
  }

  return (
    <EuiTourStep
      data-test-subj={dataId}
      title={EIS_PROMO_TOUR_TITLE}
      maxWidth={`${euiTheme.base * 25}px`}
      content={
        <EuiText>
          <p>{EIS_PROMO_TOUR_DESCRIPTION}</p>
        </EuiText>
      }
      isStepOpen={isPromoVisible}
      anchorPosition={anchorPosition}
      step={1}
      stepsTotal={1}
      onFinish={onDismissPromo}
      footerAction={[
        <EuiButtonEmpty
          data-test-subj="eisPromoTourCloseBtn"
          data-telemetry-id={`${dataId}-dismiss-btn`}
          onClick={onDismissPromo}
        >
          {TOUR_DISMISS}
        </EuiButtonEmpty>,
        ...(ctaLink
          ? [
              <EuiButton
                href={ctaLink}
                data-test-subj="eisPromoTourCtaBtn"
                data-telemetry-id={`${dataId}-learnMore-btn`}
                target="_blank"
                iconSide="right"
                iconType="popout"
              >
                {TOUR_CTA}
              </EuiButton>,
            ]
          : []),
      ]}
    >
      {children}
    </EuiTourStep>
  );
};
