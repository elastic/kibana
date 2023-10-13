/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useEffect, useState } from 'react';

import {
  EuiAccordionProps,
  EuiCollapsibleNavItem,
  EuiCollapsibleNavItemProps,
  EuiCollapsibleNavSubItemProps,
  EuiTitle,
} from '@elastic/eui';
import type { ChromeProjectNavigationNode, NodeRenderAs } from '@kbn/core-chrome-browser';
import classnames from 'classnames';

import type { NavigateToUrlFn } from '../../../types/internal';
import { useNavigation as useServices } from '../../services';
import { nodePathToString, isAbsoluteLink, getNavigationNodeHref } from '../../utils';
import { PanelContext, usePanel } from './panel';
import { NavigationItemOpenPanel } from './navigation_item_open_panel';

const nodeHasLink = (navNode: ChromeProjectNavigationNode) =>
  Boolean(navNode.deepLink) || Boolean(navNode.href);

const nodeHasChildren = (navNode: ChromeProjectNavigationNode) =>
  navNode.children ? Boolean(navNode.children.length) : false;

const getRenderAs = (navNode: ChromeProjectNavigationNode): NodeRenderAs | undefined => {
  if (navNode.renderAs) return navNode.renderAs;

  if (nodeHasLink(navNode) && !nodeHasChildren(navNode)) return 'item';

  return undefined;
};

/**
 * Predicate to determine if a node should be visible in the main side nav.
 * If it is not visible it will be filtered out and not rendered.
 */
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
  if (item.renderAs === 'item' && hasChildren) {
    return true;
  }

  if (hasChildren) {
    return item.children!.some(itemIsVisible);
  }

  return false;
};

const filterChildren = (
  _children?: ChromeProjectNavigationNode[]
): ChromeProjectNavigationNode[] | undefined => {
  if (!_children) return undefined;

  const filtered = _children.filter(itemIsVisible).map((child) => {
    if (child.children) {
      return {
        ...child,
        children: filterChildren(child.children),
      };
    }
    return child;
  });

  return filtered.length === 0 ? undefined : filtered;
};

const serializeNavNode = (navNode: ChromeProjectNavigationNode) => {
  const serialized = {
    ...navNode,
    children: filterChildren(navNode.children),
    href: getNavigationNodeHref(navNode),
  };

  serialized.renderAs = getRenderAs(serialized);

  return {
    navNode: serialized,
    hasChildren: nodeHasChildren(serialized),
    hasLink: nodeHasLink(serialized),
    isItem: serialized.renderAs === 'item',
  };
};

// TODO: There is quite a bit of duplicate logic in this function and what is inside the
// NavigationSectionUI component. In following PR I will clean all this up.
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
  const id = nodePathToString(item);
  const { renderAs = 'block' } = item;
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

  if (renderAs === 'panelOpener') {
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

  const items =
    renderAs === 'item'
      ? undefined
      : item.children?.map((_item) =>
          navigationNodeToEuiItem(_item, {
            navigateToUrl,
            openPanel,
            closePanel,
            isSideNavCollapsed,
          })
        );

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
    items,
    ['data-test-subj']: dataTestSubj,
    icon: item.icon,
    iconProps: { size: 's' },
  };
};

interface Props {
  navNode: ChromeProjectNavigationNode;
}

export const NavigationSectionUI: FC<Props> = ({ navNode: _navNode }) => {
  const { navNode, isItem, hasChildren, hasLink } = serializeNavNode(_navNode);
  const { id, title, icon, isActive, href } = navNode;
  const { navigateToUrl, isSideNavCollapsed } = useServices();
  const { open: openPanel, close: closePanel } = usePanel();
  const [isCollapsed, setIsCollapsed] = useState(!isActive);
  // We want to auto expand the group automatically if the node is active (URL match)
  // but once the user manually expand a group we don't want to close it afterward automatically.
  const [doCollapseFromActiveState, setDoCollapseFromActiveState] = useState(true);

  useEffect(() => {
    if (doCollapseFromActiveState) {
      setIsCollapsed(!isActive);
    }
  }, [isActive, doCollapseFromActiveState]);

  if (!hasLink && !hasChildren) {
    return null;
  }

  const items = isItem
    ? undefined
    : navNode.children?.map((item) =>
        navigationNodeToEuiItem(item, {
          navigateToUrl,
          isSideNavCollapsed,
          openPanel,
          closePanel,
        })
      );

  const linkProps: EuiCollapsibleNavItemProps['linkProps'] | undefined = hasLink
    ? {
        href,
        onClick: (e: React.MouseEvent) => {
          // TODO: here we might want to toggle the accordion (if we "renderAs: 'accordion'")
          // Will be done in following PR
          e.preventDefault();
          e.stopPropagation();
          if (href) {
            navigateToUrl(href);
          }
        },
      }
    : undefined;

  const accordionProps: Partial<EuiAccordionProps> | undefined = isItem
    ? undefined
    : {
        initialIsOpen: isActive,
        forceState: isCollapsed ? 'closed' : 'open',
        onToggle: (isOpen) => {
          setIsCollapsed(!isOpen);
          setDoCollapseFromActiveState(false);
        },
        ...navNode.accordionProps,
      };

  return (
    <EuiCollapsibleNavItem
      id={id}
      title={title}
      icon={icon}
      items={items}
      iconProps={{ size: 'm' }}
      linkProps={linkProps}
      accordionProps={accordionProps}
      data-test-subj={`nav-bucket-${id}`}
    />
  );
};
