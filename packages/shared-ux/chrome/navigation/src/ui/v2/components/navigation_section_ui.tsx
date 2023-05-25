/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import {
  EuiCollapsibleNavGroup,
  EuiIcon,
  EuiSideNav,
  EuiSideNavItemType,
  EuiText,
} from '@elastic/eui';
import type { BasePathService, NavigateToUrlFn } from '../../../../types/internal';
import { navigationStyles as styles } from '../../../styles';
import { useNavigation as useServices } from '../../../services';
import { ChromeProjectNavigationNode } from '../types';

const navigationNodeToEuiItem = (
  item: ChromeProjectNavigationNode,
  { navigateToUrl, basePath }: { navigateToUrl: NavigateToUrlFn; basePath: BasePathService }
): EuiSideNavItemType<unknown> => {
  const href = item.deepLink?.href;
  const id = item.path ? item.path.join('.') : item.id;

  return {
    id,
    name: item.title,
    onClick:
      href !== undefined
        ? (event: React.MouseEvent) => {
            event.preventDefault();
            navigateToUrl(basePath.prepend(href!));
          }
        : undefined,
    href,
    renderItem: item.itemRender,
    items: item.children?.map((_item) =>
      navigationNodeToEuiItem(_item, { navigateToUrl, basePath })
    ),
    ['data-test-subj']: `nav-item-${id}`,
    ...(item.icon && {
      icon: <EuiIcon type={item.icon} size="s" />,
    }),
  };
};

interface TopLevelProps {
  navNode: ChromeProjectNavigationNode;
  items?: ChromeProjectNavigationNode[];
  defaultIsCollapsed?: boolean;
}

export const NavigationSectionUI: FC<TopLevelProps> = ({
  navNode,
  items = [],
  defaultIsCollapsed = true,
}) => {
  const { id, title, icon } = navNode;
  const { navigateToUrl, basePath } = useServices();

  return (
    <EuiCollapsibleNavGroup
      id={id}
      title={title}
      iconType={icon}
      isCollapsible={true}
      initialIsOpen={!defaultIsCollapsed}
      data-test-subj={`nav-bucket-${id}`}
    >
      <EuiText color="default">
        <EuiSideNav
          items={items?.map((item) => navigationNodeToEuiItem(item, { navigateToUrl, basePath }))}
          css={styles.euiSideNavItems}
        />
      </EuiText>
    </EuiCollapsibleNavGroup>
  );
};
