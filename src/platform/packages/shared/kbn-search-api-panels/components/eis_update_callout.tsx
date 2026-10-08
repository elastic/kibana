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
import { useShowEisPromotionalContent } from '../hooks/use_show_eis_promotional_content';

/**
 * Props for the EisUpdateCallout component.
 *
 * @property {string} ctaLink
 *   URL for the call-to-action link to documentation.
 *
 * @property {string} promoId
 *   Unique identifier for this promo instance. Used for localStorage and telemetry.
 *
 * @property {boolean} shouldShowEisUpdateCallout
 *   Controls whether the callout should be displayed. Should only be set to true when the
 *   environment is cloud-enabled AND (has an enterprise license OR is serverless-enabled).
 *
 * @property {() => void} handleOnClick
 *   Callback function invoked when the call-to-action button is clicked.
 *
 * @property {boolean | undefined} hasUpdatePrivileges
 *   Indicates whether the user has update privileges. If false, the callout will not be shown.
 *
 * @property {'top' | 'bottom'} [addSpacer]
 *   Optional spacer placement. Adds spacing above or below the callout when specified.
 */
export interface EisUpdateCalloutProps {
  ctaLink: string;
  promoId: string;
  shouldShowEisUpdateCallout: boolean;
  handleOnClick: () => void;
  hasUpdatePrivileges: boolean | undefined;
  addSpacer?: 'top' | 'bottom';
}

export const EisUpdateCallout = ({
  ctaLink,
  promoId,
  shouldShowEisUpdateCallout,
  handleOnClick,
  hasUpdatePrivileges,
  addSpacer,
}: EisUpdateCalloutProps) => {
  const { isPromoVisible, onDismissPromo } = useShowEisPromotionalContent({
    promoId: `${promoId}UpdateCallout`,
  });

  const dataId = `${promoId}-eis-update-callout`;

  if (!isPromoVisible || !shouldShowEisUpdateCallout || hasUpdatePrivileges === false) {
    return null;
  }

  return (
    <>
      {addSpacer === 'top' && <EuiSpacer size="l" />}
      <AnnouncementBanner
        data-test-subj={dataId}
        title={i18n.EIS_CALLOUT_TITLE}
        text={i18n.EIS_UPDATE_CALLOUT_DESCRIPTION}
        media={<EuiIllustration type={cloudRocketDeploy} alt="" />}
        color="highlighted"
        onDismiss={onDismissPromo}
        actionProps={{
          primary: {
            children: i18n.EIS_UPDATE_CALLOUT_CTA,
            onClick: handleOnClick,
            'data-test-subj': 'eisUpdateCalloutCtaBtn',
            'data-telemetry-id': `${dataId}-updateToEis-btn`,
          },
          secondary: {
            children: i18n.EIS_CALLOUT_DOCUMENTATION_BTN,
            href: ctaLink,
            target: '_blank',
            iconType: 'external',
            iconSide: 'right',
            'data-telemetry-id': `${dataId}-viewEisDocs-btn`,
          },
        }}
      />
      {addSpacer === 'bottom' && <EuiSpacer size="l" />}
    </>
  );
};
