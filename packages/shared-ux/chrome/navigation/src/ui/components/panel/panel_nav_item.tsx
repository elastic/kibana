/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useCallback } from 'react';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import { EuiListGroupItem } from '@elastic/eui';

import { useNavigation as useServices } from '../../../services';
import { NavItemLabel } from './panel_nav_item_label';
import { usePanel } from './context';

interface Props {
  item: ChromeProjectNavigationNode;
}

export const PanelNavItem: FC<Props> = ({ item }) => {
  const { navigateToUrl } = useServices();
  const { close: closePanel } = usePanel();
  const { id, icon, deepLink, openInNewTab } = item;
  const href = deepLink?.url ?? item.href;

  const onClick = useCallback<React.MouseEventHandler>(
    (e) => {
      if (!!href) {
        e.preventDefault();
        navigateToUrl(href);
        closePanel();
      }
    },
    [closePanel, href, navigateToUrl]
  );

  return (
    <EuiListGroupItem
      key={id}
      label={<NavItemLabel item={item} />}
      wrapText
      className="sideNavPanelLink"
      size="s"
      data-test-subj={`panelNavItem panelNavItem-id-${item.id}`}
      href={href}
      iconType={icon}
      onClick={onClick}
      target={openInNewTab ? '_blank' : undefined}
    />
  );
};
