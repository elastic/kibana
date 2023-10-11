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
import type { BasePathService, NavigateToUrlFn } from '../../../types/internal';
import { useNavigation as useServices } from '../../services';
import { isAbsoluteLink } from '../../utils';

const navigationNodeToEuiItem = (
  item: ChromeProjectNavigationNode,
  { navigateToUrl, basePath }: { navigateToUrl: NavigateToUrlFn; basePath: BasePathService }
): EuiCollapsibleNavSubItemProps => {
  const href = item.deepLink?.url ?? item.href;
  const id = item.path ? item.path.join('.') : item.id;
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

  return {
    id,
    title: item.title,
    isSelected,
    accordionProps: {
      ...item.accordionProps,
      initialIsOpen: true, // FIXME open state is controlled on component mount
    },
    linkProps: { external: isExternal },
    onClick:
      href !== undefined
        ? (event: React.MouseEvent) => {
            event.preventDefault();
            navigateToUrl(href);
          }
        : undefined,
    href,
    items: item.children?.map((_item) =>
      navigationNodeToEuiItem(_item, { navigateToUrl, basePath })
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
  const { navigateToUrl, basePath } = useServices();
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
        navigationNodeToEuiItem(item, { navigateToUrl, basePath })
      )}
    />
  );
};
