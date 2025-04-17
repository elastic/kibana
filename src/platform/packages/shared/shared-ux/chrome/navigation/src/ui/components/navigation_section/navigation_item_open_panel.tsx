/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Theme, css } from '@emotion/react';
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

  const styles = {
    button: ({ euiTheme }: Theme) =>
      css`
        color: inherit;
        font-weight: inherit;
        transform: none !important; /* don't translateY 1px */
        padding-inline: calc(${euiTheme.size.xs} * 1.5);
        background-color: ${isActive ? euiTheme.colors.backgroundLightPrimary : 'transparent'};

        &:hover {
          background-color: ${isActive
            ? undefined
            : euiTheme.colors.backgroundBaseInteractiveHover};
        }
      `,
    flexGroup: ({ euiTheme }: Theme) => css`
      gap: calc(${euiTheme.size.xs} * 1.5);
    `,
  };
  return (
    <EuiButton
      onClick={onLinkClick}
      iconSide="right"
      iconSize="s"
      iconType={isExpanded ? 'arrowLeft' : 'arrowRight'}
      size="s"
      fullWidth
      css={styles.button}
      data-test-subj={dataTestSubj}
    >
      <EuiFlexGroup gutterSize="none" alignItems="center" css={styles.flexGroup}>
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
