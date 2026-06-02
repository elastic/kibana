/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import type { Observable } from 'rxjs';
import { combineLatest, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import equal from 'fast-deep-equal';
import { EuiContextMenuItem, EuiIcon, useEuiTheme } from '@elastic/eui';
import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { useChromeStyle } from '@kbn/core-chrome-browser-hooks';
import { useIsServerless } from '@kbn/react-env';
import { css } from '@emotion/react';
import type { HelpLinks, HelpMenuLinkItem } from './help_menu_links';
import { buildHelpLinks, toContextMenuItem } from './help_menu_links';
import { useNavigateToUrl, useIsNextChrome } from './chrome_hooks';
import { useChromeComponentsDeps } from '../context';

/**
 * Returns an observable of pre-built help menu link groups for the given chrome style.
 * Used by both `HeaderHelpMenu` (via `useObservable`) and the project sidenav (via `combineLatest`).
 */
export function useHelpLinks$(): Observable<HelpLinks> {
  const chrome = useChromeService();
  const chromeStyle = useChromeStyle();
  const docLinks = useChromeComponentsDeps().docLinks;
  const isNextChrome = useIsNextChrome();
  const isServerless = useIsServerless();
  const isProjectAndNextChrome = chromeStyle === 'project' && isNextChrome;
  const showNewsfeed = isProjectAndNextChrome && !isServerless;

  return useMemo(
    () =>
      combineLatest([
        chrome.getHelpMenuLinks$(),
        chrome.getHelpExtension$(),
        chrome.getHelpSupportUrl$(),
        chrome.getGlobalHelpExtensionMenuLinks$(),
        chrome.getFeedbackHandler$(),
        chrome.getNewsfeedHandler$().pipe(
          switchMap((handler) =>
            handler
              ? handler.hasNew$.pipe(
                  map((hasNew) => ({ open: handler.open, hasNew })),
                  startWith({ open: handler.open, hasNew: false })
                )
              : of(undefined)
          )
        ),
      ]).pipe(
        map(
          ([
            menuLinks,
            extension,
            supportUrl,
            globalExtensionMenuLinks,
            feedbackHandler,
            newsfeedInfo,
          ]) =>
            buildHelpLinks({
              chromeStyle,
              helpData: {
                menuLinks,
                extension,
                supportUrl,
                globalExtensionMenuLinks,
                docLinks,
                feedbackHandler: isProjectAndNextChrome ? feedbackHandler : undefined,
                newsfeedHandler: showNewsfeed ? newsfeedInfo?.open : undefined,
                newsfeedHasNew: showNewsfeed ? newsfeedInfo?.hasNew : undefined,
              },
            })
        ),
        distinctUntilChanged(equal)
      ),
    [chrome, chromeStyle, docLinks, isProjectAndNextChrome, showNewsfeed]
  );
}

export const useHelpMenuItems = ({
  closeMenu,
}: {
  closeMenu: () => void;
}): EuiContextMenuPanelItemDescriptor[] => {
  const helpLinks$ = useHelpLinks$();
  const helpLinks = useObservable(helpLinks$, { global: [], default: [] });
  const navigateToUrl = useNavigateToUrl();
  const { euiTheme } = useEuiTheme();

  const stableNavigate = useCallback((url: string) => navigateToUrl(url), [navigateToUrl]);

  const appNameStyle = useMemo(
    () =>
      css`
        font-weight: ${euiTheme.font.weight.bold};
      `,
    [euiTheme.font.weight.bold]
  );

  const indicatorStyle = useMemo(
    () =>
      css`
        position: absolute;
        top: -3px;
        right: -3px;
        pointer-events: none;
        stroke: ${euiTheme.components.buttons.backgroundText};
        stroke-width: 2px;
        paint-order: stroke;
      `,
    [euiTheme.components.buttons.backgroundText]
  );

  return useMemo(() => {
    const toIcon = (item: HelpMenuLinkItem): React.ReactElement | string | undefined => {
      if (!item.icon) return undefined;
      if (!item.hasNewIndicator) return item.icon as string;
      return (
        <span
          css={css`
            position: relative;
            display: inline-flex;
          `}
        >
          <EuiIcon type={item.icon} size="m" aria-hidden={true} />
          <EuiIcon css={indicatorStyle} color="primary" type="dot" size="m" aria-hidden={true} />
        </span>
      );
    };

    const mapItems = (items: HelpLinks['global']) =>
      items.map((item) => {
        const menuItem = toContextMenuItem(item, stableNavigate, closeMenu);
        const iconOverride = toIcon(item);
        if (iconOverride !== undefined) {
          menuItem.icon = iconOverride;
        }
        return menuItem;
      });

    const menuItems: EuiContextMenuPanelItemDescriptor[] = [
      ...mapItems(helpLinks.global),
      ...mapItems(helpLinks.default),
    ];

    if (helpLinks.extension) {
      menuItems.push({ isSeparator: true, key: 'extension-separator' });

      menuItems.push({
        renderItem: () => (
          <EuiContextMenuItem css={appNameStyle}>{helpLinks.extension?.label}</EuiContextMenuItem>
        ),
        key: 'extension-title',
      } as EuiContextMenuPanelItemDescriptor);

      menuItems.push(...mapItems(helpLinks.extension.items));
    }

    return menuItems;
  }, [helpLinks, stableNavigate, closeMenu, appNameStyle, indicatorStyle]);
};
