/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiTourStepProps } from '@elastic/eui';
import { EuiButton, EuiButtonEmpty, EuiText, EuiTourStep, useEuiTheme } from '@elastic/eui';
import * as i18n from '../translations';
import { useShowEisPromotionalContent } from '../hooks/use_show_eis_promotional_content';

/**
 * Props for the EisTokenCostTour component.
 *
 * @property {EuiTourStepProps['anchorPosition']} [anchorPosition='downCenter']
 *   Position of the tour step relative to its anchor element.
 *
 * @property {string} [ctaLink]
 *   Optional URL for the call-to-action button in the tour footer.
 *
 * @property {string} promoId
 *   Unique identifier for this promo instance. Used for localStorage and telemetry.
 *
 * @property {boolean} isCloudEnabled
 *   Indicates that the component is running in a cloud-enabled environment.
 *   The tour will only be shown if this is true.
 *
 * @property {boolean} [isReady=true]
 *   If false, the tour will not render even if promo is visible. Use to delay showing until parent is ready.
 *   Ensures the tour renders in the correct place when there is animation on the parent.
 *
 * @property {React.ReactElement} children
 *   The anchor element for the tour step. The tour wraps this element.
 */

export interface EisTokenCostTourProps {
  anchorPosition?: EuiTourStepProps['anchorPosition'];
  ctaLink?: string;
  promoId: string;
  isCloudEnabled: boolean;
  isReady?: boolean;
  children: React.ReactElement;
}

export const EisTokenCostTour = ({
  anchorPosition = 'downCenter',
  ctaLink,
  promoId,
  isCloudEnabled,
  isReady = true,
  children,
}: EisTokenCostTourProps) => {
  const { euiTheme } = useEuiTheme();
  const { isPromoVisible, onSkipTour } = useShowEisPromotionalContent({
    promoId: `${promoId}Tour`,
    isCloudEnabled,
  });
  const dataId = `${promoId}-eis-costs-tour`;

  if (!isPromoVisible || !isReady) {
    return children;
  }

  return (
    <EuiTourStep
      data-telemetry-id={dataId}
      data-test-subj={dataId}
      title={i18n.EIS_COSTS_TOUR_TITLE}
      maxWidth={`${euiTheme.base * 25}px`}
      content={
        <EuiText>
          <p>{i18n.EIS_COSTS_TOUR_DESCRIPTION}</p>
        </EuiText>
      }
      isStepOpen={isPromoVisible}
      anchorPosition={anchorPosition}
      step={1}
      stepsTotal={1}
      onFinish={onSkipTour}
      footerAction={[
        <EuiButtonEmpty
          data-test-subj="tokenConsumptionCostTourCloseBtn"
          onClick={onSkipTour}
          aria-label={i18n.EIS_COSTS_TOUR_DISMISS_ARIA}
        >
          {i18n.EIS_TOUR_DISMISS}
        </EuiButtonEmpty>,
        ...(ctaLink
          ? [
              <EuiButton
                fullWidth={false}
                color="primary"
                size="s"
                href={ctaLink}
                data-test-subj="eisCostsTourCtaBtn"
                target="_blank"
                iconSide="right"
                iconType="popout"
              >
                {i18n.EIS_TOUR_CTA}
              </EuiButton>,
            ]
          : []),
      ]}
    >
      {children}
    </EuiTourStep>
  );
};
