/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useEffect, useRef, useState } from 'react';
import {
  EuiCollapsibleNavGroup,
  EuiIcon,
  EuiLink,
  EuiSideNav,
  EuiSideNavItemType,
  EuiText,
} from '@elastic/eui';
import type { BasePathService, NavigateToUrlFn } from '../../../types/internal';
import { navigationStyles as styles } from '../../styles';
import { useNavigation as useServices } from '../../services';
import { ChromeProjectNavigationNodeEnhanced } from '../types';
import { isAbsoluteLink } from '../../utils';

type RenderItem = EuiSideNavItemType<unknown>['renderItem'];

const navigationNodeToEuiItem = (
  item: ChromeProjectNavigationNodeEnhanced,
  { navigateToUrl, basePath }: { navigateToUrl: NavigateToUrlFn; basePath: BasePathService }
): EuiSideNavItemType<unknown> => {
  const href = item.deepLink?.url ?? item.href;
  const id = item.path ? item.path.join('.') : item.id;
  const isExternal = Boolean(href) && isAbsoluteLink(href!);
  const dataTestSubj = `nav-item-${id}`;

  const getRenderItem = (): RenderItem | undefined => {
    if (!isExternal || item.renderItem) {
      return item.renderItem;
    }

    return () => (
      <div className="euiSideNavItemButton" data-test-subj={dataTestSubj}>
        <EuiLink href={href} external>
          {item.title}
        </EuiLink>
      </div>
    );
  };

  const isSelected = item.children && item.children.length > 0 ? false : item.isActive;

  return {
    id,
    name: item.title,
    isSelected,
    onClick:
      href !== undefined
        ? (event: React.MouseEvent) => {
            event.preventDefault();
            navigateToUrl(href);
          }
        : undefined,
    href,
    renderItem: getRenderItem(),
    items: item.children?.map((_item) =>
      navigationNodeToEuiItem(_item, { navigateToUrl, basePath })
    ),
    ['data-test-subj']: dataTestSubj,
    ...(item.icon && {
      icon: <EuiIcon type={item.icon} size="s" />,
    }),
  };
};

interface Props {
  navNode: ChromeProjectNavigationNodeEnhanced;
  items?: ChromeProjectNavigationNodeEnhanced[];
}

export const NavigationSectionUI: FC<Props> = ({ navNode, items = [] }) => {
  const { id, title, icon, isActive } = navNode;
  const { navigateToUrl, basePath } = useServices();
  const [isCollapsed, setIsCollapsed] = useState(!isActive);
  const initialTime = useRef(Date.now());

  // If the item has no link and no cildren, we don't want to render it
  const itemHasLinkOrChildren = (item: ChromeProjectNavigationNodeEnhanced) => {
    const hasLink = Boolean(item.deepLink) || Boolean(item.href);
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

  useEffect(() => {
    // We only want to set the collapsed state during the "mounting" phase (500ms).
    // After that, even if the URL does not match the group and the group is open we don't
    // want to collapse it automatically.
    if (Date.now() - initialTime.current < 500) {
      setIsCollapsed(!isActive);
    }
  }, [isActive]);

  if (!groupHasLink && !filteredItems.some(itemHasLinkOrChildren)) {
    return null;
  }

  return (
    <EuiCollapsibleNavGroup
      id={id}
      title={title}
      iconType={icon}
      isCollapsible={true}
      initialIsOpen={isActive}
      onToggle={(isOpen) => setIsCollapsed(!isOpen)}
      forceState={isCollapsed ? 'closed' : 'open'}
      data-test-subj={`nav-bucket-${id}`}
    >
      <EuiText color="default">
        <EuiSideNav
          items={filteredItems.map((item) =>
            navigationNodeToEuiItem(item, { navigateToUrl, basePath })
          )}
          css={styles.euiSideNavItems}
        />
      </EuiText>
    </EuiCollapsibleNavGroup>
  );
};
