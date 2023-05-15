/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiCollapsibleNavGroup,
  EuiIcon,
  EuiSideNav,
  EuiSideNavItemType,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { ChromeNavigationNodeViewModel } from '../../types';
import type { BasePathService, NavigateToUrlFn } from '../../types/internal';
import { useNavigation } from '../services';
import { navigationStyles as styles } from '../styles';

const navigationNodeToEuiItem = (
  item: ChromeNavigationNodeViewModel,
  {
    navigateToUrl,
    basePath,
    activeNavItemId,
  }: { activeNavItemId?: string; navigateToUrl: NavigateToUrlFn; basePath: BasePathService }
): EuiSideNavItemType<unknown> => {
  const path = item.path ?? item.id;

  let subjId = path;
  let isSelected: boolean = false;

  if (!item.items && path === activeNavItemId) {
    // if there are no subnav items and ID is current, mark the item as selected
    isSelected = true;
    subjId += '-selected';
  }

  return {
    id: path,
    name: item.title,
    isSelected,
    onClick:
      item.href !== undefined
        ? (event: React.MouseEvent) => {
            event.preventDefault();
            navigateToUrl(basePath.prepend(item.href!));
          }
        : undefined,
    href: item.href,
    items: item.items?.map((_item) =>
      navigationNodeToEuiItem(_item, { navigateToUrl, basePath, activeNavItemId })
    ),
    ['data-test-subj']: `nav-item-${subjId}`,
    ...(item.icon && {
      icon: <EuiIcon type={item.icon} size="s" />,
    }),
  };
};

export interface Props {
  navigationTree: ChromeNavigationNodeViewModel;
  activeNavItemId?: string;
}

export const NavigationBucket = (props: Props) => {
  const { navigationTree, activeNavItemId } = props;
  const { navIsOpen, navigateToUrl, basePath } = useNavigation();
  const { id, title, icon, items } = navigationTree;

  if (navIsOpen) {
    return (
      <EuiCollapsibleNavGroup
        id={id}
        title={title}
        iconType={icon}
        isCollapsible={true}
        initialIsOpen={activeNavItemId?.startsWith(id + '.')}
        data-test-subj={`nav-bucket-${id}`}
      >
        <EuiText color="default">
          <EuiSideNav
            items={items?.map((item) =>
              navigationNodeToEuiItem(item, { navigateToUrl, basePath, activeNavItemId })
            )}
            css={styles.euiSideNavItems}
          />
        </EuiText>
      </EuiCollapsibleNavGroup>
    );
  }

  return (
    <div>
      <EuiIcon type={icon ?? 'empty'} size="l" />
      <hr />
    </div>
  );
};
