/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, type FC } from 'react';
import classNames from 'classnames';
import { css } from '@emotion/react';
import { transparentize, EuiButton } from '@elastic/eui';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import { isActiveFromUrl } from '../../utils';
import type { NavigateToUrlFn } from '../../types';
import { usePanel } from './panel';

interface Props {
  item: ChromeProjectNavigationNode;
  navigateToUrl: NavigateToUrlFn;
  activeNodes: ChromeProjectNavigationNode[][];
}

export const NavigationItemOpenPanel: FC<Props> = ({ item, activeNodes }: Props) => {
  const { open: openPanel, close: closePanel, selectedNode } = usePanel();
  const { title, deepLink } = item;
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
      togglePanel(e.target);
      return;
    },
    [togglePanel]
  );

  return (
    <EuiButton
      onClick={onLinkClick}
      iconSide="right"
      iconType="arrowRight"
      size="s"
      fullWidth
      css={({ euiTheme }) => css`
        background-color: ${isActive
          ? transparentize(euiTheme.colors.lightShade, 0.5)
          : 'transparent'};
        transform: none !important; /* don't translateY 1px */
        color: inherit;
        font-weight: inherit;
        padding-inline: ${euiTheme.size.s};
        & > span {
          justify-content: flex-start;
          position: relative;
        }
        & .euiIcon {
          position: absolute;
          right: 0;
          top: 0;
          transform: translateY(50%);
        }
      `}
      data-test-subj={dataTestSubj}
    >
      {title}
    </EuiButton>
  );
};
