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
import { isAbsoluteLink } from '../../utils';
import { PanelContext, usePanel } from './panel';

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
  const id = item.path ? item.path.join('.') : item.id;
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

  const onClick = (e: React.MouseEvent) => {
    if (href !== undefined || itemOpenPanel) {
      if (href !== undefined) {
        e.preventDefault();
        navigateToUrl(href);
        closePanel();
        return;
      }
      if (itemOpenPanel) {
        if (isSideNavCollapsed) {
          return;
        }
        openPanel({ ...item, id });
      }
    }
    if (!itemOpenPanel) {
      closePanel();
    }
  };

  return {
    id,
    isGroupTitle: item.isGroupTitle,
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
      : item.children?.map((_item) =>
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

  // If the item has no link and no cildren, we don't want to render it
  const itemHasLinkOrChildren = (item: ChromeProjectNavigationNode) => {
    const isGroupTitle = Boolean(item.isGroupTitle);
    const hasLink = Boolean(item.deepLink) || Boolean(item.href);
    if (isGroupTitle) {
      return true;
    }
    if (hasLink) {
      return true;
    }
    const hasChildren = Boolean(item.children?.length);
    if (hasChildren) {
      return item.children!.some(itemHasLinkOrChildren);
    }
    return false;
  };

  const filteredItems = items.filter(itemHasLinkOrChildren).map((item) => {
    if (item.children) {
      return {
        ...item,
        children: item.children.filter(itemHasLinkOrChildren),
      };
    }
    return item;
  });

  const groupHasLink = Boolean(navNode.deepLink) || Boolean(navNode.href);
  const groupHasChildren = filteredItems.some(itemHasLinkOrChildren);
  // Group with a link and no children will be rendered as a link and not an EUI accordion
  const groupIsLink = groupHasLink && !groupHasChildren;
  const groupHref = navNode.deepLink?.url ?? navNode.href!;

  useEffect(() => {
    if (doCollapseFromActiveState) {
      setIsCollapsed(!isActive);
    }
  }, [isActive, doCollapseFromActiveState]);

  if (!groupHasLink && !groupHasChildren) {
    return null;
  }

  const propsForGroupAsLink: Partial<EuiCollapsibleNavItemProps> = groupIsLink
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
      {...propsForGroupAsLink}
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
