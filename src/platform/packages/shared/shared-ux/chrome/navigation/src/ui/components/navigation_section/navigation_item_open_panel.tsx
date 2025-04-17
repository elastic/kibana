/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import classNames from 'classnames';
import React, { useCallback, type FC } from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import type { NavigateToUrlFn } from '../../../types';
import { isActiveFromUrl } from '../../../utils';
import { usePanel } from '../panel';
import { SubItemBadge } from '../subitem_badge';

interface Props {
  item: ChromeProjectNavigationNode;
  navigateToUrl: NavigateToUrlFn;
  activeNodes: ChromeProjectNavigationNode[][];
}

export const NavigationItemOpenPanel: FC<Props> = ({ item, activeNodes }: Props) => {
  const { open: openPanel, close: closePanel, selectedNode } = usePanel();
  const { title, deepLink, icon, withBadge, badgeOptions } = item;
  const { id, path } = item;
  const isExpanded = selectedNode?.path === path;
  const isActive = isActiveFromUrl(item.path, activeNodes) || isExpanded;

  const dataTestSubj = classNames(`nav-item`, `nav-item-${path}`, {
    [`nav-item-deepLinkId-${deepLink?.id}`]: !!deepLink,
    [`nav-item-id-${id}`]: id,
    [`nav-item-isActive`]: isActive,
  });

  const togglePanel = useCallback(
    (target: EventTarget) => {
      if (selectedNode?.id === item.id) {
        closePanel();
      } else {
        openPanel(item, target as Element);
      }
    },
    [selectedNode?.id, item, closePanel, openPanel]
  );

  const onLinkClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      togglePanel(e.target);
    },
    [togglePanel]
  );

  return (
    <EuiButton
      onClick={onLinkClick}
      iconSide="right"
      iconSize="s"
      iconType={isExpanded ? 'arrowLeft' : 'arrowRight'}
      size="s"
      fullWidth
      css={({ euiTheme }) =>
        css`
          &:hover {
            background-color: ${isActive
              ? euiTheme.colors.backgroundLightPrimary
              : euiTheme.colors.backgroundBaseInteractiveHover};
          }
          background-color: ${
            isActive
            ? euiTheme.colors.backgroundLightPrimary
            : 'transparent' /* prettier-ignore */
          };
          color: inherit;
          font-weight: inherit;
          padding-inline: calc(${euiTheme.size.xs} * 1.5);
        `
      }
      data-test-subj={dataTestSubj}
    >
      <EuiFlexGroup
        gutterSize="none"
        alignItems="center"
        css={({ euiTheme }) => css`
          gap: calc(${euiTheme.size.xs} * 1.5);
        `}
      >
        {icon && (
          <EuiFlexItem grow={false}>
            <EuiIcon type={icon} />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>{title}</EuiFlexItem>
        {withBadge && (
          <EuiFlexItem grow={false}>
            <SubItemBadge icon={badgeOptions?.icon} tooltip={badgeOptions?.tooltip} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiButton>
  );
};
