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
  EIS_CLOUD_CONNECT_PROMO_TOUR_CTA,
  EIS_CLOUD_CONNECT_PROMO_DESCRIPTION,
  EIS_CLOUD_CONNECT_PROMO_TOUR_TITLE,
} from '../translations';
import { useShowEisPromotionalContent } from '../hooks/use_show_eis_promotional_content';
import { useKibana } from '../hooks/use_kibana';
import { EIS_TOUR_ENABLED_FEATURE_FLAG_ID } from '../constants';

/**
 * Props for the EisCloudConnectPromoTour component.
 *
 * @property {EuiTourStepProps['anchorPosition']} [anchorPosition='downCenter']
 *   Position of the tour step relative to its anchor element.
 *
 * @property {string} [navigateToApp]
 *   Callback function invoked when the call-to-action button is clicked.
 *   Navigates the user to the cloud connect management application.
 *
 * @property {string} promoId
 *   Unique identifier for this promo instance. Used for localStorage and telemetry.
 *
 * @property {boolean} isSelfManaged
 *   Indicates that the component is running in a self-managed environment.
 *   The tour will only be shown if this is true.
 *
 * @property {boolean} [isReady=true]
 *   If false, the tour will not render even if promo is visible. Use to delay showing until parent is ready.
 *   Ensures the tour renders in the correct place when there is animation on the parent.
 *
 * @property {React.ReactElement} children
 *   The anchor element for the tour step. The tour wraps this element.
 */

export interface EisCloudConnectPromoTourProps {
  anchorPosition?: EuiTourStepProps['anchorPosition'];
  navigateToApp: () => void;
  promoId: string;
  isSelfManaged: boolean;
  isReady?: boolean;
  children: React.ReactElement;
}

export const EisCloudConnectPromoTour = ({
  anchorPosition = 'downCenter',
  navigateToApp,
  promoId,
  isSelfManaged,
  isReady = true,
  children,
}: EisCloudConnectPromoTourProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { application, notifications, uiSettings },
  } = useKibana();
  const userAllowsTours = notifications?.tours?.isEnabled() ?? true;
  // Setting to enable hiding the tour for FTR tests
  const isEISTourEnabled = uiSettings?.get<boolean>(EIS_TOUR_ENABLED_FEATURE_FLAG_ID, true);
  const { isPromoVisible, onDismissPromo } = useShowEisPromotionalContent({
    promoId: `${promoId}CloudConnectTour`,
  });

  const dataId = `${promoId}-cloud-connect-tour`;

  const hasCloudConnectPermission = Boolean(
    application.capabilities.cloudConnect?.show || application.capabilities.cloudConnect?.configure
  );

  if (
    !isPromoVisible ||
    !isReady ||
    !isSelfManaged ||
    !hasCloudConnectPermission ||
    !isEISTourEnabled ||
    !userAllowsTours
  ) {
    return children;
  }

  return (
    <EuiTourStep
      data-test-subj={dataId}
      title={EIS_CLOUD_CONNECT_PROMO_TOUR_TITLE}
      maxWidth={`${euiTheme.base * 25}px`}
      content={
        <EuiText>
          <p>{EIS_CLOUD_CONNECT_PROMO_DESCRIPTION}</p>
        </EuiText>
      }
      display="block"
      isStepOpen={isPromoVisible}
      anchorPosition={anchorPosition}
      step={1}
      stepsTotal={1}
      onFinish={onDismissPromo}
      footerAction={[
        <EuiButtonEmpty
          data-test-subj="eisCloudConnectPromoTourCloseBtn"
          data-telemetry-id={`${dataId}-dismiss-btn`}
          onClick={onDismissPromo}
        >
          {TOUR_DISMISS}
        </EuiButtonEmpty>,
        <EuiButton
          onClick={navigateToApp}
          data-test-subj="eisCloudConnectPromoTourCtaBtn"
          data-telemetry-id={`${dataId}-connectYourCluster-btn`}
          iconSide="right"
          iconType="popout"
        >
          {EIS_CLOUD_CONNECT_PROMO_TOUR_CTA}
        </EuiButton>,
      ]}
    >
      {children}
    </EuiTourStep>
  );
};
