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
 * @property {'row' | 'column'} direction
 *   Layout direction for the callout content. Determines how the icon and text are arranged.
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
  direction: 'row' | 'column';
  hasUpdatePrivileges: boolean | undefined;
  addSpacer?: 'top' | 'bottom';
}

export const EisUpdateCallout = ({
  ctaLink,
  promoId,
  shouldShowEisUpdateCallout,
  handleOnClick,
  direction,
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
      <EuiCallOut
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
                data-telemetry-id={`${dataId}-updateToEis-btn`}
              >
                {i18n.EIS_UPDATE_CALLOUT_CTA}
              </EuiButton>
              <EuiLink
                href={ctaLink}
                target="_blank"
                external
                color="text"
                data-telemetry-id={`${dataId}-viewEisDocs-btn`}
              >
                {i18n.EIS_CALLOUT_DOCUMENTATION_BTN}
              </EuiLink>
            </EuiFlexGroup>
          </div>
        </EuiFlexGroup>
      </EuiCallOut>
      {addSpacer === 'bottom' && <EuiSpacer size="l" />}
    </>
  );
};
