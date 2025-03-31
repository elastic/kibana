/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  EuiButton,
} from '@elastic/eui';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import { useNavigation as useServices } from '../../services';
import { isActiveFromUrl } from '../../utils';
import type { NavigateToUrlFn } from '../../types';
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

const getButtonStyles = (euiTheme: EuiThemeComputed<{}>, isActive: boolean) => css`
  background-color: ${isActive ? transparentize(euiTheme.colors.lightShade, 0.5) : 'transparent'};
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
`;

interface Props {
  item: ChromeProjectNavigationNode;
  navigateToUrl: NavigateToUrlFn;
  activeNodes: ChromeProjectNavigationNode[][];
}

export const NavigationItemOpenPanel: FC<Props> = ({ item, navigateToUrl, activeNodes }: Props) => {
  const { euiTheme } = useEuiTheme();
  const { open: openPanel, close: closePanel, selectedNode } = usePanel();
  const { isSideNavCollapsed } = useServices();
  const { title, deepLink, children } = item;
  const { id, path } = item;
  const href = deepLink?.url ?? item.href;
  const isNotMobile = useIsWithinMinBreakpoint('s');
  const isIconVisible = isNotMobile && !isSideNavCollapsed && !!children && children.length > 0;
  const hasLandingPage = Boolean(href);
  const isExpanded = selectedNode?.path === path;
  const isActive = isActiveFromUrl(item.path, activeNodes) || isExpanded;

  const lastOpenByHoverTS = React.useRef<number | null>(null);

  const itemClassNames = classNames(
    'sideNavItem',
    { 'sideNavItem--isActive': isActive },
    getStyles(euiTheme)
  );

  const buttonClassNames = classNames('sideNavItem', getButtonStyles(euiTheme, isActive));

  const dataTestSubj = classNames(`nav-item`, `nav-item-${path}`, {
    [`nav-item-deepLinkId-${deepLink?.id}`]: !!deepLink,
    [`nav-item-id-${id}`]: id,
    [`nav-item-isActive`]: isActive,
  });

  const buttonDataTestSubj = classNames(`panelOpener`, `panelOpener-${path}`, {
    [`panelOpener-id-${id}`]: id,
    [`panelOpener-deepLinkId-${deepLink?.id}`]: !!deepLink,
  });

  const togglePanel = useCallback(
    (target: EventTarget) => {
      if (selectedNode?.id === item.id) {
        // we want to avoid closing the panel if the user just opened it by hovering
        const recentlyOpenedByHover =
          lastOpenByHoverTS.current && Date.now() - lastOpenByHoverTS.current < 500;
        if (!recentlyOpenedByHover) {
          closePanel();
        }
      } else {
        openPanel(item, target as Element);
      }
    },
    [selectedNode?.id, item, closePanel, openPanel]
  );

  const onLinkClick = useCallback(
    (e: React.MouseEvent) => {
      if (!href) {
        togglePanel(e.target);
        return;
      }
      e.preventDefault();
      navigateToUrl(href);
      closePanel();
    },
    [closePanel, href, navigateToUrl, togglePanel]
  );

  const onIconClick = useCallback(
    (e: React.MouseEvent) => {
      togglePanel(e.target);
    },
    [togglePanel]
  );

  const { onMouseEnter, onMouseLeave } = useHoverOpener({
    onOpen: (e: React.MouseEvent) => {
      lastOpenByHoverTS.current = Date.now();
      openPanel(item, e.target as Element);
    },
  });

  if (!hasLandingPage) {
    return (
      <EuiButton
        onClick={onLinkClick}
        iconSide="right"
        iconType="arrowRight"
        size="s"
        fullWidth
        className={buttonClassNames}
        data-test-subj={dataTestSubj}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {title}
      </EuiButton>
    );
  }

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
            display={isExpanded ? 'base' : 'empty'}
            size="s"
            color="text"
            onClick={onIconClick}
            iconType="spaces"
            iconSize="m"
            aria-label={i18n.translate('sharedUXPackages.chrome.sideNavigation.togglePanel', {
              defaultMessage: 'Toggle "{title}" panel navigation',
              values: { title },
            })}
            aria-expanded={isExpanded}
            data-test-subj={buttonDataTestSubj}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const useHoverOpener = ({ onOpen }: { onOpen: (e: React.MouseEvent) => void }) => {
  const HOVER_OPEN_DELAY = 200;
  const HOVER_CLOSE_DELAY = 300;

  const openTimer = React.useRef<number | null>(null);
  const closeTimer = React.useRef<number | null>(null);

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const onMouseEnter = useCallback(
    (event: React.MouseEvent) => {
      clearTimers();
      openTimer.current = window.setTimeout(() => {
        onOpen(event);
      }, HOVER_OPEN_DELAY);
    },
    [onOpen]
  );

  const onMouseLeave = useCallback((event: React.MouseEvent) => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => {
      // TODO?
    }, HOVER_CLOSE_DELAY);
  }, []);

  return {
    onMouseEnter,
    onMouseLeave,
  };
};
