/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';

import {
  EuiAccordionProps,
  EuiCollapsibleNavItem,
  EuiCollapsibleNavItemProps,
  EuiCollapsibleNavSubItemProps,
  EuiTitle,
} from '@elastic/eui';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import classnames from 'classnames';

import type { NavigateToUrlFn } from '../../../types/internal';
import { useNavigation as useServices } from '../../services';
import { nodePathToString, isAbsoluteLink, getNavigationNodeHref } from '../../utils';
import { PanelContext, usePanel } from './panel';
import { NavigationItemOpenPanel } from './navigation_item_open_panel';

const nodeHasLink = (navNode: ChromeProjectNavigationNode) =>
  Boolean(navNode.deepLink) || Boolean(navNode.href);

const nodeHasChildren = (navNode: ChromeProjectNavigationNode) => Boolean(navNode.children?.length);

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

  if (nodeHasLink(item)) {
    return true;
  }

  if (nodeHasChildren(item)) {
    return item.renderAs === 'item' ? true : item.children!.some(itemIsVisible);
  }

  return false;
};

const filterChildren = (
  children?: ChromeProjectNavigationNode[]
): ChromeProjectNavigationNode[] | undefined => {
  if (!children) return undefined;
  return children.filter(itemIsVisible);
};

const serializeNavNode = (navNode: ChromeProjectNavigationNode) => {
  const serialized = {
    ...navNode,
    id: nodePathToString(navNode),
    children: filterChildren(navNode.children),
    href: getNavigationNodeHref(navNode),
  };

  return {
    navNode: serialized,
    hasChildren: nodeHasChildren(serialized),
    hasLink: nodeHasLink(serialized),
    isItem: serialized.renderAs === 'item' || serialized.children === undefined,
  };
};

const isEuiCollapsibleNavItemProps = (
  props: EuiCollapsibleNavItemProps | EuiCollapsibleNavSubItemProps
): props is EuiCollapsibleNavItemProps => {
  return (
    props.title !== undefined && (props as EuiCollapsibleNavSubItemProps).renderItem === undefined
  );
};

// Generate the EuiCollapsible props for both the root component (EuiCollapsibleNavItem) and its
// "items" props. Both are compatible with the exception of "renderItem" which is only used for
// sub items.
const nodeToEuiCollapsibleNavProps = (
  _navNode: ChromeProjectNavigationNode,
  {
    navigateToUrl,
    openPanel,
    closePanel,
    isSideNavCollapsed,
    treeDepth,
  }: {
    navigateToUrl: NavigateToUrlFn;
    openPanel: PanelContext['open'];
    closePanel: PanelContext['close'];
    isSideNavCollapsed: boolean;
    treeDepth: number;
  }
): { props: EuiCollapsibleNavItemProps | EuiCollapsibleNavSubItemProps; isVisible: boolean } => {
  const { navNode, isItem, hasChildren, hasLink } = serializeNavNode(_navNode);

  const { id, title, href, icon, renderAs, isActive, deepLink, isGroupTitle } = navNode;
  const isExternal = Boolean(href) && isAbsoluteLink(href!);
  const isSelected = hasChildren ? false : isActive;
  const dataTestSubj = classnames(`nav-item`, `nav-item-${id}`, {
    [`nav-item-deepLinkId-${deepLink?.id}`]: !!deepLink,
    [`nav-item-id-${id}`]: id,
    [`nav-item-isActive`]: isSelected,
  });

  // Note: this can be replaced with an `isGroup` API or whatever you prefer
  // Could also probably be pulled out to a separate component vs inlined
  if (isGroupTitle) {
    const props: EuiCollapsibleNavSubItemProps = {
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
            {title}
          </div>
        </EuiTitle>
      ),
    };
    return { props, isVisible: true };
  }

  if (renderAs === 'panelOpener') {
    const props: EuiCollapsibleNavSubItemProps = {
      renderItem: () => <NavigationItemOpenPanel item={navNode} navigateToUrl={navigateToUrl} />,
    };
    return { props, isVisible: true };
  }

  const onClick = (e: React.MouseEvent) => {
    if (href !== undefined) {
      e.preventDefault();
      navigateToUrl(href);
      closePanel();
      return;
    }
  };

  const items: EuiCollapsibleNavItemProps['items'] = isItem
    ? undefined
    : navNode.children
        ?.map((child) =>
          nodeToEuiCollapsibleNavProps(child, {
            navigateToUrl,
            openPanel,
            closePanel,
            isSideNavCollapsed,
            treeDepth: treeDepth + 1,
          })
        )
        .filter(({ isVisible }) => isVisible)
        .map((res) => res.props);

  const linkProps: EuiCollapsibleNavItemProps['linkProps'] | undefined = hasLink
    ? {
        href,
        external: isExternal,
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
        initialIsOpen: treeDepth === 0 ? isActive : true, // FIXME open state is controlled on component mount
        ...navNode.accordionProps,
      };

  const props: EuiCollapsibleNavItemProps = {
    id,
    title,
    isSelected,
    accordionProps,
    linkProps,
    onClick,
    href,
    items,
    ['data-test-subj']: dataTestSubj,
    icon,
    iconProps: { size: treeDepth === 0 ? 'm' : 's' },
  };

  const hasVisibleChildren = (items?.length ?? 0) > 0;
  return { props, isVisible: isItem || hasVisibleChildren };
};

interface Props {
  navNode: ChromeProjectNavigationNode;
}

export const NavigationSectionUI: FC<Props> = ({ navNode }) => {
  const { navigateToUrl, isSideNavCollapsed } = useServices();
  const { open: openPanel, close: closePanel } = usePanel();

  const { props, isVisible } = nodeToEuiCollapsibleNavProps(navNode, {
    navigateToUrl,
    openPanel,
    closePanel,
    isSideNavCollapsed,
    treeDepth: 0,
  });

  if (!isEuiCollapsibleNavItemProps(props)) {
    throw new Error(`Invalid EuiCollapsibleNavItem props for node ${props.id}`);
  }

  if (!isVisible) {
    return null;
  }

  return <EuiCollapsibleNavItem {...props} />;
};
