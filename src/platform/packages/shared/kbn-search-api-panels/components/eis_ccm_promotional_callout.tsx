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
import * as i18n from '../translations';
import { useKibana } from '../hooks/use_kibana';
import { useShowEisPromotionalContent } from '../hooks/use_show_eis_promotional_content';
import searchRocketIcon from '../assets/search-rocket.svg';

export interface EisCloudConnectPromoCalloutProps {
  promoId: string;
  isSelfManaged: boolean;
  navigateToApp: () => void;
  direction: 'row' | 'column';
  addSpacer?: 'top' | 'bottom';
}

export const EisCloudConnectPromoCallout = ({
  promoId,
  isSelfManaged,
  navigateToApp,
  direction,
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
      <EuiCallOut
        data-telemetry-id={dataId}
        data-test-subj={dataId}
        css={({ euiTheme }) => ({
          backgroundColor: `${euiTheme.colors.backgroundBaseSubdued}`,
          border: `${euiTheme.border.thin}`,
          borderRadius: `${euiTheme.border.radius.medium}`,
        })}
        onDismiss={onDismissPromo}
      >
        <EuiFlexGroup direction={direction} alignItems="flexStart">
          <EuiImage src={searchRocketIcon} alt="" size="original" />
          <div>
            <EuiTitle>
              <h4>{i18n.EIS_CALLOUT_TITLE}</h4>
            </EuiTitle>
            <EuiText color="subdued" size="s">
              <p>{i18n.EIS_CLOUD_CONNECT_PROMO_DESCRIPTION}</p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiButton
              fullWidth={false}
              color="text"
              size="s"
              onClick={navigateToApp}
              data-test-subj="eisUpdateCalloutCtaBtn"
              data-telemetry-id={`${dataId}-connectYourCluster-btn`}
              iconSide="right"
              iconType="popout"
            >
              {i18n.EIS_CLOUD_CONNECT_PROMO_TOUR_CTA}
            </EuiButton>
          </div>
        </EuiFlexGroup>
      </EuiCallOut>
      {addSpacer === 'bottom' && <EuiSpacer size="l" />}
    </>
  );
};
