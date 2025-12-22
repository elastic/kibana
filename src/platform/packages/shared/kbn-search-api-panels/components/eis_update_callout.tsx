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
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import * as i18n from '../translations';
import { useShowEisPromotionalContent } from '../hooks/use_show_eis_promotional_content';
import searchRocketIcon from '../assets/search-rocket.svg';

export interface EisUpdateCalloutProps {
  ctaLink: string;
  promoId: string;
  isCloudEnabled: boolean;
  handleOnClick: () => void;
  direction: 'row' | 'column';
  hasUpdatePrivileges: boolean | undefined;
}

export const EisUpdateCallout = ({
  ctaLink,
  promoId,
  isCloudEnabled,
  handleOnClick,
  direction,
  hasUpdatePrivileges,
}: EisUpdateCalloutProps) => {
  const { isPromoVisible, onDismissTour } = useShowEisPromotionalContent({
    promoId: `${promoId}UpdateCallout`,
  });

  const dataId = `${promoId}-eis-update-callout`;

  if (!isPromoVisible || !isCloudEnabled || hasUpdatePrivileges === false) {
    return null;
  }

  return (
    <EuiCallOut
      data-telemetry-id={dataId}
      data-test-subj={dataId}
      css={({ euiTheme }) => ({
        color: euiTheme.colors.primaryText,
        backgroundColor: `${euiTheme.colors.backgroundBaseSubdued}`,
        border: `${euiTheme.border.thin}`,
        borderRadius: `${euiTheme.border.radius.medium}`,
      })}
      onDismiss={onDismissTour}
    >
      <EuiFlexGroup direction={direction} alignItems="flexStart">
        <EuiImage src={searchRocketIcon} alt="" size="original" />
        <div>
          <EuiTitle>
            <h4>{i18n.EIS_CALLOUT_TITLE}</h4>
          </EuiTitle>
          <EuiText color="subdued" size="s">
            <p>{i18n.EIS_UPDATE_CALLOUT_DESCRIPTION}</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
            <EuiButton
              fullWidth={false}
              color="text"
              size="s"
              onClick={handleOnClick}
              data-test-subj="eisUpdateCalloutCtaBtn"
              data-telemetry-id={`${dataId}-cta-btn`}
            >
              {i18n.EIS_UPDATE_CALLOUT_CTA}
            </EuiButton>
            <EuiLink
              href={ctaLink}
              target="_blank"
              external
              color="text"
              data-telemetry-id={`${dataId}-docs-btn`}
            >
              {i18n.EIS_CALLOUT_DOCUMENTATION_BTN}
            </EuiLink>
          </EuiFlexGroup>
        </div>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
