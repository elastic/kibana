/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useEffect, useState } from 'react';

import {
  EuiCollapsibleNavItem,
  EuiCollapsibleNavItemProps,
  EuiCollapsibleNavSubItemProps,
  EuiTitle,
} from '@elastic/eui';
import { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import classnames from 'classnames';
import type { NavigateToUrlFn } from '../../../types/internal';
import { useNavigation as useServices } from '../../services';
import { getUniqueNodeId, isAbsoluteLink } from '../../utils';
import { PanelContext, usePanel } from './panel';
import { NavigationItemOpenPanel } from './navigation_item_open_panel';

const navigationNodeToEuiItem = (
  item: ChromeProjectNavigationNode,
  {
    navigateToUrl,
    openPanel,
    closePanel,
    isSideNavCollapsed,
  }: {
    navigateToUrl: NavigateToUrlFn;
    openPanel: PanelContext['open'];
    closePanel: PanelContext['close'];
    isSideNavCollapsed: boolean;
  }
): EuiCollapsibleNavSubItemProps => {
  const href = item.deepLink?.url ?? item.href;
  const id = getUniqueNodeId(item);
  const { openPanel: itemOpenPanel = false } = item;
  const isExternal = Boolean(href) && isAbsoluteLink(href!);
  const isSelected = item.children && item.children.length > 0 ? false : item.isActive;
  const dataTestSubj = classnames(`nav-item`, `nav-item-${id}`, {
    [`nav-item-deepLinkId-${item.deepLink?.id}`]: !!item.deepLink,
    [`nav-item-id-${item.id}`]: item.id,
    [`nav-item-isActive`]: isSelected,
  });

  // Note: this can be replaced with an `isGroup` API or whatever you prefer
  // Could also probably be pulled out to a separate component vs inlined
  if (item.isGroupTitle) {
    return {
      renderItem: () => (
        <EuiTitle
          size="xxxs"
          className="eui-textTruncate"
          css={({ euiTheme }: any) => ({
            marginTop: euiTheme.size.base,
            paddingBlock: euiTheme.size.xs,
            paddingInline: euiTheme.size.s,
          })}
        >
          <div id={id} data-test-subj={dataTestSubj}>
            {item.title}
          </div>
        </EuiTitle>
      ),
    };
  }

  if (itemOpenPanel) {
    return {
      renderItem: () => <NavigationItemOpenPanel item={item} navigateToUrl={navigateToUrl} />,
    };
  }

  const onClick = (e: React.MouseEvent) => {
    if (href !== undefined) {
      e.preventDefault();
      navigateToUrl(href);
      closePanel();
      return;
    }
  };

  const filteredChildren = item.children?.filter((child) => child.sideNavStatus !== 'hidden');

  return {
    id,
    title: item.title,
    isSelected,
    accordionProps: {
      ...item.accordionProps,
      initialIsOpen: true, // FIXME open state is controlled on component mount
    },
    linkProps: { external: isExternal },
    onClick,
    href,
    items: itemOpenPanel
      ? undefined // Don't render children if the item opens a panel
      : filteredChildren?.map((_item) =>
          navigationNodeToEuiItem(_item, {
            navigateToUrl,
            openPanel,
            closePanel,
            isSideNavCollapsed,
          })
        ),
    ['data-test-subj']: dataTestSubj,
    icon: item.icon,
    iconProps: { size: 's' },
  };
};

interface Props {
  navNode: ChromeProjectNavigationNode;
  items?: ChromeProjectNavigationNode[];
}

export const NavigationSectionUI: FC<Props> = ({ navNode, items = [] }) => {
  const { id, title, icon, isActive } = navNode;
  const { navigateToUrl, isSideNavCollapsed } = useServices();
  const { open: openPanel, close: closePanel } = usePanel();
  const [isCollapsed, setIsCollapsed] = useState(!isActive);
  // We want to auto expand the group automatically if the node is active (URL match)
  // but once the user manually expand a group we don't want to close it afterward automatically.
  const [doCollapseFromActiveState, setDoCollapseFromActiveState] = useState(true);

  // If the item has no link and no children, we don't want to render it
  const itemIsVisible = (item: ChromeProjectNavigationNode) => {
    if (item.sideNavStatus === 'hidden') return false;

    const isGroupTitle = Boolean(item.isGroupTitle);
    if (isGroupTitle) {
      return true;
    }

    const hasLink = Boolean(item.deepLink) || Boolean(item.href);
    if (hasLink) {
      return true;
    }

    const hasChildren = Boolean(item.children?.length);
    if (item.sideNavStatus === 'renderAsItem' && hasChildren) {
      return true;
    }

    if (hasChildren) {
      return item.children!.some(itemIsVisible);
    }

    return false;
  };

  const filterItems = (_items: ChromeProjectNavigationNode[]): ChromeProjectNavigationNode[] => {
    return _items.filter(itemIsVisible).map((_item) => {
      if (_item.children) {
        return {
          ..._item,
          children: filterItems(_item.children),
        };
      }
      return _item;
    });
  };

  const filteredItems = filterItems(items);

  const groupHasLink = Boolean(navNode.deepLink) || Boolean(navNode.href);
  const groupIsVisible = filteredItems.length > 0;
  // Group with a link and no children will be rendered as a link and not an EUI accordion
  const groupHref = navNode.deepLink?.url ?? navNode.href!;

  useEffect(() => {
    if (doCollapseFromActiveState) {
      setIsCollapsed(!isActive);
    }
  }, [isActive, doCollapseFromActiveState]);

  if (!groupHasLink && !groupIsVisible) {
    return null;
  }

  const propsForGroupAsItem: Partial<EuiCollapsibleNavItemProps> =
    navNode.sideNavStatus === 'renderAsItem'
      ? {
          linkProps: {
            href: groupHref,
            onClick: (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              navigateToUrl(groupHref);
            },
          },
        }
      : {};

  return (
    <EuiCollapsibleNavItem
      id={id}
      title={title}
      icon={icon}
      iconProps={{ size: 'm' }}
      accordionProps={{
        initialIsOpen: isActive,
        forceState: isCollapsed ? 'closed' : 'open',
        onToggle: (isOpen) => {
          setIsCollapsed(!isOpen);
          setDoCollapseFromActiveState(false);
        },
        ...navNode.accordionProps,
      }}
      data-test-subj={`nav-bucket-${id}`}
      {...propsForGroupAsItem}
      items={filteredItems.map((item) =>
        navigationNodeToEuiItem(item, {
          navigateToUrl,
          isSideNavCollapsed,
          openPanel,
          closePanel,
        })
      )}
    />
  );
};
