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
  EuiButtonIcon,
  EuiFlexGroup,
  EuiImage,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import searchRocketIcon from '../assets/search-rocket.svg';
import {
  EIS_PROMO_CALLOUT_CTA,
  EIS_PROMO_CALLOUT_DESCRIPTION,
  EIS_PROMO_CALLOUT_ICON_ALT,
  EIS_PROMO_CALLOUT_TITLE,
} from '../translations';
import { useShowEisPromotionalContent } from '../hooks/use_show_eis_promotional_content';

export interface EisPromotionalCalloutProps {
  ctaLink: string;
  promoId: string;
  isCloudEnabled: boolean;
  direction: 'row' | 'column';
}

export const EisPromotionalCallout = ({
  ctaLink,
  promoId,
  isCloudEnabled,
  direction,
}: EisPromotionalCalloutProps) => {
  const { isPromoVisible, onSkipTour } = useShowEisPromotionalContent({
    promoId: `${promoId}Callout`,
    isCloudEnabled,
  });

  const dataId = `${promoId}-eis-promo-callout`;

  if (!isPromoVisible) {
    return null;
  }

  return (
    <EuiPanel
      grow={false}
      data-telemetry-id={dataId}
      data-test-subj={dataId}
      css={({ euiTheme }) => ({
        color: euiTheme.colors.primaryText,
        border: `1px ${euiTheme.colors.borderBaseSubdued} solid`,
        position: 'relative',
      })}
      paddingSize="m"
      color="subdued"
    >
      <div style={{ position: 'absolute', top: 8, right: 8 }}>
        <EuiButtonIcon iconType="cross" aria-label="Dismiss" onClick={onSkipTour} size="s" />
      </div>
      <EuiFlexGroup direction={direction} alignItems="flexStart">
        <EuiImage src={searchRocketIcon} alt={EIS_PROMO_CALLOUT_ICON_ALT} size="original" />
        <div>
          <EuiTitle size="xxs">
            <h2>{EIS_PROMO_CALLOUT_TITLE}</h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText color="subdued" size="s">
            <p>{EIS_PROMO_CALLOUT_DESCRIPTION}</p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiButton
            fullWidth={false}
            color="text"
            size="s"
            href={ctaLink}
            data-test-subj="eisPromoCalloutCtaBtn"
            target="_blank"
            iconSide="right"
            iconType="popout"
          >
            {EIS_PROMO_CALLOUT_CTA}
          </EuiButton>
        </div>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
