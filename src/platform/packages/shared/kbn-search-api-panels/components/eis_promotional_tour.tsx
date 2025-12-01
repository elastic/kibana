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
  type EuiTourStepProps,
} from '@elastic/eui';
import { EIS_PROMO_TOUR_CLOSE } from '../translations';
import { useShowEisPromotionalContent } from '../hooks/use_show_eis_promotional_content';
import { TOUR_CONTENT } from '../constants';

export interface EisPromotionalTourProps {
  anchorPosition?: EuiTourStepProps['anchorPosition'];
  ctaLink?: string;
  promoId: keyof typeof TOUR_CONTENT;
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
  const { isPromoVisible, onSkipTour } = useShowEisPromotionalContent({
    promoId: `${promoId}Tour`,
    isCloudEnabled,
  });
  const dataId = `${promoId}-eis-promo-tour`;
  const tourCopy = TOUR_CONTENT[promoId];

  if (!isPromoVisible) {
    return children;
  }

  return (
    <EuiTourStep
      data-telemetry-id={dataId}
      data-test-subj={dataId}
      title={tourCopy.title}
      maxWidth="400px"
      content={
        <EuiText>
          <p>{tourCopy.description}</p>
        </EuiText>
      }
      display="block"
      isStepOpen={isPromoVisible}
      anchorPosition={anchorPosition}
      step={1}
      stepsTotal={1}
      onFinish={onSkipTour}
      footerAction={[
        <EuiButtonEmpty data-test-subj="eisPromoTourCloseBtn" onClick={onSkipTour}>
          {EIS_PROMO_TOUR_CLOSE}
        </EuiButtonEmpty>,
        ...(ctaLink
          ? [
              <EuiButton
                href={ctaLink}
                data-test-subj="eisPromoTourCtaBtn"
                target="_blank"
                iconSide="right"
                iconType="popout"
              >
                {tourCopy.cta}
              </EuiButton>,
            ]
          : []),
      ]}
    >
      {children}
    </EuiTourStep>
  );
};
