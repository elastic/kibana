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
  EuiBadge,
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  closePopover: () => void;
  onClick: () => void;
}

export const CustomizeNavigationUserMenuLink = ({ closePopover, onClick }: Props) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiContextMenuItem
      icon={<EuiIcon type="controls" aria-hidden={true} />}
      onClick={() => {
        closePopover();
        onClick();
      }}
      data-test-subj="customizeNavigationUserMenuLink"
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          {i18n.translate('navigationCustomizationComponents.userMenuLinkLabel', {
            defaultMessage: 'Customize navigation',
          })}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={euiTheme.colors.backgroundFilledPrimary}>
            {i18n.translate('navigationCustomizationComponents.userMenuLinkBadgeLabel', {
              defaultMessage: 'New',
            })}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiContextMenuItem>
  );
};
