/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, type FC } from 'react';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import { css } from '@emotion/css';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  type EuiThemeComputed,
  useEuiTheme,
  transparentize,
  useIsWithinMinBreakpoint,
} from '@elastic/eui';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import type { NavigateToUrlFn } from '../../../types/internal';
import { nodePathToString } from '../../utils';
import { useNavigation as useServices } from '../../services';
import { usePanel } from './panel';

const getStyles = (euiTheme: EuiThemeComputed<{}>) => css`
  * {
    // EuiListGroupItem changes the links font-weight, we need to override it
    font-weight: ${euiTheme.font.weight.regular};
  }
  &.sideNavItem:hover {
    background-color: transparent;
  }
  &.sideNavItem--isActive:hover,
  &.sideNavItem--isActive {
    background-color: ${transparentize(euiTheme.colors.lightShade, 0.5)};
    & * {
      font-weight: ${euiTheme.font.weight.medium};
    }
  }
`;

interface Props {
  item: ChromeProjectNavigationNode;
  navigateToUrl: NavigateToUrlFn;
}

export const NavigationItemOpenPanel: FC<Props> = ({ item, navigateToUrl }: Props) => {
  const { euiTheme } = useEuiTheme();
  const { open: openPanel, close: closePanel, selectedNode } = usePanel();
  const { isSideNavCollapsed } = useServices();
  const { title, deepLink, isActive, children } = item;
  const id = nodePathToString(item);
  const href = deepLink?.url ?? item.href;
  const isNotMobile = useIsWithinMinBreakpoint('s');
  const isIconVisible = isNotMobile && !isSideNavCollapsed && !!children && children.length > 0;

  const itemClassNames = classNames(
    'sideNavItem',
    { 'sideNavItem--isActive': isActive },
    getStyles(euiTheme)
  );

  const dataTestSubj = classNames(`nav-item`, `nav-item-${id}`, {
    [`nav-item-deepLinkId-${deepLink?.id}`]: !!deepLink,
    [`nav-item-id-${id}`]: id,
    [`nav-item-isActive`]: isActive,
  });
  const buttonDataTestSubj = classNames(`panelOpener`, `panelOpener-${id}`, {
    [`panelOpener-deepLinkId-${deepLink?.id}`]: !!deepLink,
  });

  const onLinkClick = useCallback(
    (e: React.MouseEvent) => {
      if (!href) {
        return;
      }
      e.preventDefault();
      navigateToUrl(href);
      closePanel();
    },
    [closePanel, href, navigateToUrl]
  );

  const onIconClick = useCallback(() => {
    if (selectedNode?.id === item.id) {
      closePanel();
    } else {
      openPanel(item);
    }
  }, [openPanel, closePanel, item, selectedNode]);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <EuiFlexItem style={{ flexBasis: isIconVisible ? '80%' : '100%' }}>
        <EuiListGroup gutterSize="none">
          <EuiListGroupItem
            label={title}
            href={href}
            wrapText
            onClick={onLinkClick}
            className={itemClassNames}
            color="text"
            size="s"
            data-test-subj={dataTestSubj}
          />
        </EuiListGroup>
      </EuiFlexItem>
      {isIconVisible && (
        <EuiFlexItem grow={0} style={{ flexBasis: '15%' }}>
          <EuiButtonIcon
            display={nodePathToString(selectedNode) === id ? 'base' : 'empty'}
            size="s"
            color="text"
            onClick={onIconClick}
            iconType="spaces"
            iconSize="m"
            aria-label={i18n.translate('sharedUXPackages.chrome.sideNavigation.togglePanel', {
              defaultMessage: 'Toggle panel navigation',
            })}
            data-test-subj={buttonDataTestSubj}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
