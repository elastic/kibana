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
  EuiCallOut,
  EuiFlexGroup,
  EuiImage,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import searchRocketIcon from '../assets/search-rocket.svg';
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
  direction: 'row' | 'column';
}

export const EisPromotionalCallout = ({
  ctaLink,
  promoId,
  isCloudEnabled,
  direction,
}: EisPromotionalCalloutProps) => {
  const { isPromoVisible, onDismissPromo } = useShowEisPromotionalContent({
    promoId: `${promoId}EisPromoCallout`,
  });

  const dataId = `${promoId}-eis-promo-callout`;

  if (!isPromoVisible || !isCloudEnabled) {
    return null;
  }

  return (
    <EuiCallOut
      data-test-subj={dataId}
      css={({ euiTheme }) => ({
        backgroundColor: `${euiTheme.colors.backgroundBaseSubdued}`,
        border: `${euiTheme.border.thin}`,
        borderRadius: `${euiTheme.border.radius.medium}`,
      })}
      onDismiss={onDismissPromo}
    >
      <EuiFlexGroup
        direction={direction}
        alignItems="flexStart"
        gutterSize={direction === 'row' ? 'l' : 'm'}
      >
        <EuiImage src={searchRocketIcon} alt="" />
        <div>
          <EuiTitle>
            <h4>{EIS_CALLOUT_TITLE}</h4>
          </EuiTitle>
          <EuiText color="subdued" size="s">
            <p>{EIS_PROMO_CALLOUT_DESCRIPTION}</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton
            fullWidth={false}
            color="text"
            size="s"
            href={ctaLink}
            data-test-subj="eisPromoCalloutCtaBtn"
            data-telemetry-id={`${dataId}-viewEisDocs-link`}
            target="_blank"
            iconSide="right"
            iconType="popout"
          >
            {EIS_CALLOUT_DOCUMENTATION_BTN}
          </EuiButton>
        </div>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
