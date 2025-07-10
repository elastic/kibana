/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Theme, css } from '@emotion/react';
import React, { FC, useCallback } from 'react';

import { EuiListGroupItem } from '@elastic/eui';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';

import { useNavigation as useServices } from '../../../services';
import { isSpecialClick } from '../../../utils';
import { useNavigation } from '../../navigation';
import { SubItemTitle } from '../subitem_title';
import { usePanel } from './context';

interface Props {
  item: ChromeProjectNavigationNode;
}

const panelNavStyles = ({ euiTheme }: Theme) => css`
  background-color: ${euiTheme.colors.backgroundBaseSubdued};

  &:focus,
  &:focus-within {
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
  }

  &:hover {
    background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
  }

  &.isSelected {
    background-color: ${euiTheme.colors.backgroundLightPrimary};

    &:focus-within {
      background-color: ${euiTheme.colors.backgroundLightPrimary};
    }

    &:hover {
      background-color: ${euiTheme.colors.backgroundLightPrimary};
    }

    * {
      color: ${euiTheme.colors.textPrimary};
    }
  }

  & svg[class*='EuiExternalLinkIcon'] {
    margin-left: auto;
  }
`;

export const PanelNavItem: FC<Props> = ({ item }) => {
  const { navigateToUrl, eventTracker, basePath } = useServices();
  const { activeNodes } = useNavigation();
  const { close: closePanel } = usePanel();
  const { id, path, icon, deepLink, openInNewTab, isExternalLink, renderItem } = item;

  const href = deepLink?.url ?? item.href;

  const onClick = useCallback<React.MouseEventHandler<HTMLButtonElement>>(
    (e) => {
      if (href) {
        eventTracker.clickNavLink({
          id,
          path,
          href: basePath.remove(href),
          hrefPrev: basePath.remove(window.location.pathname),
        });
      }

      if (isSpecialClick(e)) {
        return;
      }

      if (href) {
        e.preventDefault();
        navigateToUrl(href);
        closePanel();
      }
    },
    [closePanel, id, path, href, navigateToUrl, basePath, eventTracker]
  );

  if (renderItem) {
    return renderItem();
  }

  const isSelected = activeNodes[0]?.find(({ path: activePath }) => {
    return activePath === item.path;
  });

  return (
    <EuiListGroupItem
      key={id}
      label={<SubItemTitle item={item} />}
      aria-label={item.title}
      wrapText
      size="s"
      css={panelNavStyles}
      className={isSelected ? 'isSelected' : undefined}
      data-test-subj={`panelNavItem panelNavItem-id-${item.id}`}
      href={href}
      iconType={icon}
      onClick={onClick}
      external={isExternalLink}
      target={openInNewTab ? '_blank' : undefined}
    />
  );
};
