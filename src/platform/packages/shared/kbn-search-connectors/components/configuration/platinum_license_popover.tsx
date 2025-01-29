/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { css } from '@emotion/react';

import {
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  EuiPopoverFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiPopoverProps,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

interface PlatinumLicensePopoverProps {
  button: EuiPopoverProps['button'];
  closePopover: () => void;
  isPopoverOpen: boolean;
  stackManagementHref?: string;
  subscriptionLink?: string;
}

export const PlatinumLicensePopover: React.FC<PlatinumLicensePopoverProps> = ({
  button,
  isPopoverOpen,
  closePopover,
  stackManagementHref,
  subscriptionLink,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={closePopover}>
      <EuiPopoverTitle>
        {i18n.translate('searchConnectors.connectors.upgradeTitle', {
          defaultMessage: 'Upgrade to Elastic Platinum',
        })}
      </EuiPopoverTitle>
      <EuiText
        grow={false}
        size="s"
        css={css`
          max-width: calc(${euiTheme.size.xl} * 10);
        `}
      >
        <p>
          {i18n.translate('searchConnectors.connectors.upgradeDescription', {
            defaultMessage:
              'To use this connector, you must update your license to Platinum or start a 30-day free trial.',
          })}
        </p>
      </EuiText>
      <EuiPopoverFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          {subscriptionLink && (
            <EuiFlexItem grow={false}>
              <EuiButton iconType="popout" target="_blank" href={subscriptionLink}>
                {i18n.translate('searchConnectors.connectors.subscriptionLabel', {
                  defaultMessage: 'Subscription plans',
                })}
              </EuiButton>
            </EuiFlexItem>
          )}
          {stackManagementHref && (
            <EuiFlexItem grow={false}>
              <EuiButton iconType="wrench" iconSide="right" href={stackManagementHref}>
                {i18n.translate('searchConnectors.manageLicenseButtonLabel', {
                  defaultMessage: 'Manage license',
                })}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
