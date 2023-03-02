/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiListGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  useIsWithinBreakpoints,
  useEuiTheme,
  EuiListGroupItem,
} from '@elastic/eui';

import classNames from 'classnames';
import { METRIC_TYPE } from '@kbn/analytics';
import { SideNavigationPanel } from './side_navigation_panel';
import type { DefaultSideNavItem, SideNavItem, Tracker } from './types';
import { isCustomItem, isDefaultItem, type LinkCategories } from './types';
import { TELEMETRY_EVENT } from './telemetry/const';
import { TelemetryContextProvider, useTelemetryContext } from './telemetry/telemetry_context';
import { SideNavItemStyles } from './side_navigation.styles';

export interface SideNavigationProps {
  items: SideNavItem[];
  selectedId: string;
  footerItems?: SideNavItem[];
  panelBottomOffset?: string;
  // This enables Telemetry tracking inside side navigation, this has to be bound with the plugin appId
  // e.g.: usageCollection?.reportUiCounter?.bind(null, appId)
  tracker?: Tracker;
}
export interface SideNavigationItemsProps {
  items: SideNavItem[];
  selectedId: string;
  activePanelNavId: ActivePanelNav;
  isMobileSize: boolean;
  navItemsById: NavItemsById;
  onOpenPanelNav: (id: string) => void;
}
export interface SideNavigationItemProps {
  item: SideNavItem;
  isSelected: boolean;
  isActive: boolean;
  hasPanelNav: boolean;
  onOpenPanelNav: (id: string) => void;
}

type ActivePanelNav = string | null;
type NavItemsById = Record<
  string,
  { title: string; panelItems: DefaultSideNavItem[]; categories?: LinkCategories }
>;

export const SideNavigationComponent: React.FC<SideNavigationProps> = ({
  items,
  selectedId,
  footerItems = [],
  panelBottomOffset,
  tracker,
}) => {
  const isMobileSize = useIsWithinBreakpoints(['xs', 's']);

  const [activePanelNavId, setActivePanelNavId] = useState<ActivePanelNav>(null);
  const activePanelNavIdRef = useRef<ActivePanelNav>(null);

  const openPanelNav = (id: string) => {
    activePanelNavIdRef.current = id;
    setActivePanelNavId(id);
  };

  const onClosePanelNav = useCallback(() => {
    activePanelNavIdRef.current = null;
    setActivePanelNavId(null);
  }, []);

  const onOutsidePanelClick = useCallback(() => {
    const currentPanelNavId = activePanelNavIdRef.current;
    setTimeout(() => {
      // This event is triggered on outside click.
      // Closing the side nav at the end of event loop to make sure it
      // closes also if the active panel button has been clicked (toggle),
      // but it does not close if any any other panel open button has been clicked.
      if (activePanelNavIdRef.current === currentPanelNavId) {
        onClosePanelNav();
      }
    });
  }, [onClosePanelNav]);

  const navItemsById = useMemo<NavItemsById>(
    () =>
      [...items, ...footerItems].reduce<NavItemsById>((acc, navItem) => {
        if (isDefaultItem(navItem) && navItem.items && navItem.items.length > 0) {
          acc[navItem.id] = {
            title: navItem.label,
            panelItems: navItem.items,
            categories: navItem.categories,
          };
        }
        return acc;
      }, {}),
    [items, footerItems]
  );

  const portalNav = useMemo(() => {
    if (activePanelNavId == null || !navItemsById[activePanelNavId]) {
      return null;
    }
    const { panelItems, title, categories } = navItemsById[activePanelNavId];
    return (
      <SideNavigationPanel
        onClose={onClosePanelNav}
        onOutsideClick={onOutsidePanelClick}
        items={panelItems}
        title={title}
        categories={categories}
        bottomOffset={panelBottomOffset}
      />
    );
  }, [activePanelNavId, panelBottomOffset, navItemsById, onClosePanelNav, onOutsidePanelClick]);

  return (
    <TelemetryContextProvider tracker={tracker}>
      <EuiFlexGroup gutterSize="none" direction="column">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="none" direction="column">
            <EuiFlexItem>
              <EuiListGroup gutterSize="none">
                <SideNavigationItems
                  items={items}
                  selectedId={selectedId}
                  activePanelNavId={activePanelNavId}
                  isMobileSize={isMobileSize}
                  navItemsById={navItemsById}
                  onOpenPanelNav={openPanelNav}
                />
              </EuiListGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiListGroup gutterSize="none">
                <SideNavigationItems
                  items={footerItems}
                  selectedId={selectedId}
                  activePanelNavId={activePanelNavId}
                  isMobileSize={isMobileSize}
                  navItemsById={navItemsById}
                  onOpenPanelNav={openPanelNav}
                />
              </EuiListGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {portalNav}
    </TelemetryContextProvider>
  );
};
export const SideNavigation = React.memo(SideNavigationComponent);

const SideNavigationItems: React.FC<SideNavigationItemsProps> = ({
  items,
  selectedId,
  activePanelNavId,
  isMobileSize,
  navItemsById,
  onOpenPanelNav,
}) => (
  <>
    {items.map((item) => (
      <SideNavItem
        key={item.id}
        item={item}
        isSelected={selectedId === item.id}
        isActive={activePanelNavId === item.id}
        hasPanelNav={!isMobileSize && item.id in navItemsById}
        onOpenPanelNav={onOpenPanelNav}
      />
    ))}
  </>
);

const SideNavigationItemComponent: React.FC<SideNavigationItemProps> = ({
  item,
  isSelected,
  isActive,
  hasPanelNav,
  onOpenPanelNav,
}) => {
  const { euiTheme } = useEuiTheme();
  const { tracker } = useTelemetryContext();

  if (isCustomItem(item)) {
    return <Fragment key={item.id}>{item.render(isSelected)}</Fragment>;
  }

  const { id, href, label, onClick } = item;

  const onLinkClicked: React.MouseEventHandler = (ev) => {
    tracker?.(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.NAVIGATION}${id}`);
    onClick?.(ev);
  };

  const sideNavItemStyles = SideNavItemStyles(euiTheme);
  const itemClassNames = classNames(
    'solutionGroupedNavItem',
    {
      'solutionGroupedNavItem--isActive': isActive,
      'solutionGroupedNavItem--isPrimary': isSelected,
    },
    sideNavItemStyles
  );
  const buttonClassNames = classNames('solutionGroupedNavItemButton');

  const onButtonClick: React.MouseEventHandler = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    tracker?.(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.GROUPED_NAVIGATION_TOGGLE}${id}`);
    onOpenPanelNav(id);
  };

  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink
      key={id}
      href={href}
      onClick={onLinkClicked}
      color={isSelected ? 'primary' : 'text'}
      data-test-subj={`groupedNavItemLink-${id}`}
    >
      <EuiListGroupItem
        className={itemClassNames}
        color={isSelected ? 'primary' : 'text'}
        label={label}
        size="s"
        {...(hasPanelNav
          ? {
              extraAction: {
                className: buttonClassNames,
                color: isActive ? 'primary' : 'text',
                onClick: onButtonClick,
                iconType: 'spaces',
                iconSize: 'm',
                'aria-label': 'Toggle group nav',
                'data-test-subj': `groupedNavItemButton-${id}`,
                alwaysShow: true,
              },
            }
          : {})}
      />
    </EuiLink>
  );
};
const SideNavItem = React.memo(SideNavigationItemComponent);

// eslint-disable-next-line import/no-default-export
export default SideNavigation;
