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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { NavigationItemInfo } from '@kbn/core-chrome-browser';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const CORE_ITEM_IDS = new Set(['discover', 'dashboards']);

const CORE_LOCKED_ITEM_TOOLTIP = i18n.translate(
  'core.ui.chrome.sideNavigation.customizeNavigation.coreLockedItemTooltip',
  {
    defaultMessage:
      "Can not be changed, as it is a core item across all solutions.",
  }
);

interface Props {
  item: NavigationItemInfo;
}

export const LockedItem = ({ item }: Props) => {
  const { euiTheme } = useEuiTheme();
  const panelCss = css`
    padding-left: ${euiTheme.size.s};
    padding-right: ${euiTheme.size.s};
    cursor: not-allowed;
  `;

  const isCoreItem = CORE_ITEM_IDS.has(item.id);

  const tooltipContent = isCoreItem
    ? CORE_LOCKED_ITEM_TOOLTIP
    : i18n.translate('core.ui.chrome.sideNavigation.customizeNavigation.lockedItemTooltip', {
        defaultMessage: '{itemTitle} cannot be reordered or hidden',
        values: { itemTitle: item.title },
      });

  const leftAreaCss = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    flex: 1;
    min-width: 0;
  `;

  return (
    <EuiPanel key={item.id} paddingSize="s" hasShadow={false} disabled css={panelCss}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
          <EuiToolTip content={tooltipContent} position="right" repositionOnScroll={false} anchorProps={{ css: css`display: inline-flex; max-width: fit-content;` }}>
            <div css={leftAreaCss}>
              <EuiIcon type="lock" color={euiTheme.colors.textDisabled} css={css`flex-shrink: 0;`} />
              {item.icon && (
                <EuiIcon type={item.icon} size="m" css={css`flex-shrink: 0;`} />
              )}
              <EuiText size="s" css={css`min-width: 0;`}>
                {item.title}
              </EuiText>
            </div>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            compressed
            label={i18n.translate(
              'core.ui.chrome.sideNavigation.customizeNavigation.lockedItemAriaLabel',
              {
                defaultMessage: '{itemTitle} cannot be reordered or hidden',
                values: { itemTitle: item.title },
              }
            )}
            showLabel={false}
            checked={!item.hidden}
            onChange={() => {}}
            disabled
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
