/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, useCallback } from 'react';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import { EuiListGroupItem, transparentize, useEuiTheme } from '@elastic/eui';
import classNames from 'classnames';
import { css } from '@emotion/css';

import { useNavigation as useServices } from '../../../services';
import { SubItemTitle } from '../subitem_title';
import { usePanel } from './context';

interface Props {
  item: ChromeProjectNavigationNode;
}

export const PanelNavItem: FC<Props> = ({ item }) => {
  const { navigateToUrl } = useServices();
  const { close: closePanel } = usePanel();
  const { id, icon, deepLink, openInNewTab, isExternalLink, renderItem } = item;

  const href = deepLink?.url ?? item.href;
  const { euiTheme } = useEuiTheme();

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

  return renderItem ? (
    renderItem()
  ) : (
    <EuiListGroupItem
      key={id}
      label={<SubItemTitle item={item} />}
      wrapText
      className={classNames(
        'sideNavPanelLink',
        css`
          &.sideNavPanelLink:hover {
            background-color: ${transparentize(euiTheme.colors.lightShade, 0.5)};
          }
          & svg[class*='EuiExternalLinkIcon'] {
            margin-left: auto;
          }
        `
      )}
      size="s"
      data-test-subj={`panelNavItem panelNavItem-id-${item.id}`}
      href={href}
      iconType={icon}
      onClick={onClick}
      external={isExternalLink}
      target={openInNewTab ? '_blank' : undefined}
    />
  );
};
