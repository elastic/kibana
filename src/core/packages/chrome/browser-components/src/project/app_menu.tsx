/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTab,
  EuiTabs,
  EuiTitle,
  useEuiTheme,
  type UseEuiTheme,
} from '@elastic/eui';

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import type { AppMenuHeaderTab, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { useLayoutUpdate } from '@kbn/core-chrome-layout-components';
import { HeaderAppMenu } from '../shared/header_app_menu';
import { HeaderActionMenu } from '../shared/header_action_menu';
import { HeaderProjectAppBarNavControls } from '../shared/header_nav_controls';
import { HeaderPageAnnouncer } from '../shared/header_page_announcer';
import { ProjectHeaderBadgeGroup } from './project_header_badge_group';
import {
  useAppMenu,
  useProjectBreadcrumbs,
  useNavigateToUrl,
  useBasePath,
  useNavLinks,
  useCurrentAppId,
  useDocLinks,
  useHasLegacyActionMenu,
} from '../shared/chrome_hooks';

const getAccessibleTitleFromBreadcrumb = (
  breadcrumb: ChromeBreadcrumb | undefined
): string | undefined => {
  if (!breadcrumb) {
    return undefined;
  }
  if (typeof breadcrumb['aria-label'] === 'string' && breadcrumb['aria-label'].length > 0) {
    return breadcrumb['aria-label'];
  }
  if (typeof breadcrumb.text === 'string' && breadcrumb.text.length > 0) {
    return breadcrumb.text;
  }
  return undefined;
};

const noop = () => {};

/** Fallback when `AppMenuBar` unmounts; matches `grid_layout` default `applicationTopBarHeight`. */
const PROJECT_APP_MENU_BAR_HEIGHT_DEFAULT = 48;

const canNavigateToParent = (crumb: ChromeBreadcrumb | undefined): boolean => {
  if (!crumb) {
    return false;
  }
  return Boolean(crumb.onClick || crumb.href);
};

const useAppMenuBarStyles = (
  euiTheme: UseEuiTheme['euiTheme'],
  hasSecondaryRow: boolean,
  showBackToParent: boolean,
  hasHeaderTabs: boolean
) =>
  useMemo(() => {
    const root = {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      gap: 0,
      paddingTop: euiTheme.size.s,
      paddingInline: euiTheme.size.s,
      paddingBottom: hasHeaderTabs ? 0 : euiTheme.size.s,
      background: euiTheme.colors.backgroundBasePlain,
      borderBottom: euiTheme.border.thin,
      marginBottom: `-${euiTheme.border.width.thin}`,
      minHeight: 0,
      boxSizing: 'border-box' as const,
      '&:hover .appMenuBar__globalActions': {
        opacity: 1,
        pointerEvents: 'auto' as const,
      },
      '&:focus-within .appMenuBar__globalActions': {
        opacity: 1,
        pointerEvents: 'auto' as const,
      },
    };

    const topRow = {
      display: 'flex',
      flexDirection: 'row' as const,
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: euiTheme.size.s,
      flex: hasSecondaryRow ? ('0 0 auto' as const) : ('1 1 auto' as const),
      minHeight: hasSecondaryRow ? undefined : 0,
      minWidth: 0,
    };

    const leftCluster = {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'row' as const,
      alignItems: 'center',
      gap: euiTheme.size.s,
    };

    const titleSection = {
      flex: '0 1 auto',
      minWidth: 0,
      maxWidth: '100%',
      display: 'flex',
      alignItems: 'center',
    };

    const globalActions = {
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'row' as const,
      alignItems: 'center',
      gap: euiTheme.size.xs,
      opacity: 0,
      pointerEvents: 'none' as const,
      transition: `opacity ${euiTheme.animation.fast} ease`,
    };

    const iconButtonSubdued = {
      color: euiTheme.colors.textSubdued,
    };

    const titleEuiTitle = {
      margin: 0,
      minWidth: 0,
      maxWidth: '100%',
      ...(showBackToParent ? {} : { paddingLeft: euiTheme.size.xs }),
      // color: euiTheme.colors.textSubdued,
    };

    const titleEuiTitleReact = {
      ...titleEuiTitle,
      display: 'flex',
      alignItems: 'center',
    };

    const menuSection = {
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: euiTheme.size.s,
      marginLeft: 'auto',
    };

    const metadataRow = {
      width: '100%',
      flexShrink: 0,
      minWidth: 0,
      color: euiTheme.colors.textSubdued,
      paddingLeft: euiTheme.size.xs,
    };

    const metadataItem = {
      minWidth: 0,
      flexShrink: 1,
    };

    const badgeGroup = {
      flex: '0 0 auto' as const,
      flexShrink: 0,
      minWidth: 0,
      width: 'fit-content',
      maxWidth: '100%',
    };

    const tabsRow = {
      display: 'flex',
      flexDirection: 'row' as const,
      alignItems: 'center',
      width: '100%',
      flexShrink: 0,
      minWidth: 0,
    };

    return {
      root,
      topRow,
      leftCluster,
      titleSection,
      metadataRow,
      metadataItem,
      badgeGroup,
      tabsRow,
      globalActions,
      iconButtonSubdued,
      titleEuiTitle,
      titleEuiTitleReact,
      menuSection,
    };
  }, [euiTheme, hasSecondaryRow, showBackToParent, hasHeaderTabs]);

const AppMenuBarHeaderTabs = ({ tabs }: { tabs: AppMenuHeaderTab[] }) => (
  <EuiTabs
    bottomBorder={false}
    data-test-subj="kibanaProjectHeaderAppMenuTabs"
    css={{ marginBottom: 0, width: '100%' }}
  >
    {tabs.map((tab) => (
      <EuiTab
        key={tab.id}
        href={tab.href}
        isSelected={tab.isSelected}
        onClick={tab.onClick}
        data-test-subj={tab.testId}
        disabled={tab.disabled}
        append={tab.append}
      >
        {tab.label}
      </EuiTab>
    ))}
  </EuiTabs>
);

export const AppMenuBar = React.memo(() => {
  const { euiTheme } = useEuiTheme();
  const updateLayout = useLayoutUpdate();
  const appMenuConfig = useAppMenu();
  const headerTabs = appMenuConfig?.headerTabs;
  const hasHeaderTabs = Boolean(headerTabs?.length);
  const headerMetadataItems = useMemo(
    () => appMenuConfig?.headerMetadata?.filter(Boolean) ?? [],
    [appMenuConfig?.headerMetadata]
  );
  const hasHeaderMetadata = headerMetadataItems.length > 0;
  const headerBadgeItems = useMemo(
    () => appMenuConfig?.headerBadges?.filter(Boolean) ?? [],
    [appMenuConfig?.headerBadges]
  );
  const hasHeaderBadges = headerBadgeItems.length > 0;
  const hasSecondaryRow = hasHeaderTabs || hasHeaderMetadata;
  const projectHeaderRef = useRef<HTMLDivElement>(null);
  const breadcrumbs = useProjectBreadcrumbs();
  const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
  const parentBreadcrumb =
    breadcrumbs.length >= 2 ? breadcrumbs[breadcrumbs.length - 2] : undefined;
  const hideBackFromAppMenu = appMenuConfig?.hideProjectHeaderBackButton === true;
  const showBackToParent =
    !hideBackFromAppMenu &&
    Boolean(parentBreadcrumb) &&
    canNavigateToParent(parentBreadcrumb);
  const styles = useAppMenuBarStyles(euiTheme, hasSecondaryRow, showBackToParent, hasHeaderTabs);
  const hasLegacyActionMenu = useHasLegacyActionMenu();

  useLayoutEffect(() => {
    const el = projectHeaderRef.current;
    if (!el) {
      return;
    }

    const syncHeight = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      updateLayout({ applicationTopBarHeight: height });
    };

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(syncHeight);
    });

    ro.observe(el);
    syncHeight();

    return () => {
      ro.disconnect();
      updateLayout({ applicationTopBarHeight: PROJECT_APP_MENU_BAR_HEIGHT_DEFAULT });
    };
  }, [updateLayout]);
  const navigateToUrl = useNavigateToUrl();
  const basePath = useBasePath();
  const docLinks = useDocLinks();
  const globalOverflowItems = useMemo(
    (): AppMenuItemType[] => [
      {
        id: 'global-add-data',
        label: i18n.translate('core.ui.chrome.appMenu.addDataLabel', {
          defaultMessage: 'Add data',
        }),
        iconType: 'plusInCircle',
        order: 100,
        separator: 'above',
        run: () => navigateToUrl(basePath.prepend('/app/integrations')),
      },
      {
        id: 'global-documentation',
        label: i18n.translate('core.ui.chrome.appMenu.documentationLabel', {
          defaultMessage: 'Documentation',
        }),
        iconType: 'documentation',
        order: 101,
        href: docLinks.links.elasticStackGetStarted,
        target: '_blank',
      },
    ],
    [navigateToUrl, basePath, docLinks]
  );
  const navLinks = useNavLinks();
  const currentAppId = useCurrentAppId();
  const currentAppTitleFromNav = useMemo(() => {
    if (!currentAppId) {
      return undefined;
    }
    return navLinks.find((link) => link.id === currentAppId)?.title;
  }, [navLinks, currentAppId]);
  const titleWhenNoProjectBreadcrumb = useMemo(
    () =>
      currentAppTitleFromNav ??
      i18n.translate('core.ui.chrome.appMenu.titleFallbackWithoutBreadcrumb', {
        defaultMessage: 'Page',
      }),
    [currentAppTitleFromNav]
  );
  const titleContent = lastBreadcrumb?.text;
  const hasTitle = titleContent != null && titleContent !== '' && typeof titleContent !== 'boolean';

  const accessibleTitle = getAccessibleTitleFromBreadcrumb(lastBreadcrumb);
  const reactNodeAriaLabel =
    hasTitle && typeof titleContent !== 'string' && accessibleTitle
      ? { 'aria-label': accessibleTitle }
      : {};

  const parentAccessibleLabel = getAccessibleTitleFromBreadcrumb(parentBreadcrumb);
  const backAriaLabel = parentAccessibleLabel
    ? i18n.translate('core.ui.chrome.appMenu.backToPageAriaLabel', {
        defaultMessage: 'Back to {pageTitle}',
        values: { pageTitle: parentAccessibleLabel },
      })
    : i18n.translate('core.ui.chrome.appMenu.backButtonAriaLabel', {
        defaultMessage: 'Back',
      });

  const onBackClick = (event: React.MouseEvent) => {
    if (!parentBreadcrumb) {
      return;
    }
    if (parentBreadcrumb.onClick) {
      parentBreadcrumb.onClick(event as React.MouseEvent<HTMLElement>);
      return;
    }
    if (parentBreadcrumb.href) {
      event.preventDefault();
      const { href } = parentBreadcrumb;
      if (href.startsWith('http://') || href.startsWith('https://')) {
        navigateToUrl(href);
      } else {
        // Breadcrumb hrefs are often already basePath-prefixed (e.g. /qco/app/...); remove then
        // prepend so we never double the space/project prefix.
        navigateToUrl(basePath.prepend(basePath.remove(href)));
      }
    }
  };

  return (
    <>
      <HeaderPageAnnouncer breadcrumbs={breadcrumbs} />
      <div
        ref={projectHeaderRef}
        className="header__actionMenu"
        data-test-subj="kibanaProjectHeader"
        css={styles.root}
      >
        <div css={styles.topRow}>
          <div css={styles.leftCluster}>
            {showBackToParent ? (
              <EuiButtonIcon
                aria-label={backAriaLabel}
                color="text"
                css={styles.iconButtonSubdued}
                data-test-subj="kibanaProjectHeaderAppMenuBack"
                display="empty"
                iconType="sortLeft"
                onClick={onBackClick}
                size="xs"
                type="button"
              />
            ) : null}
            <div css={styles.titleSection}>
              {hasTitle ? (
                typeof titleContent === 'string' ? (
                  <EuiTitle size="xs" css={styles.titleEuiTitle}>
                    <span className="eui-textTruncate" title={titleContent}>
                      {titleContent}
                    </span>
                  </EuiTitle>
                ) : (
                  <EuiTitle size="xs" css={styles.titleEuiTitleReact} {...reactNodeAriaLabel}>
                    <span className="eui-textTruncate">{titleContent}</span>
                  </EuiTitle>
                )
              ) : (
                <EuiTitle size="xs" css={styles.titleEuiTitle}>
                  <span className="eui-textTruncate" title={titleWhenNoProjectBreadcrumb}>
                    {titleWhenNoProjectBreadcrumb}
                  </span>
                </EuiTitle>
              )}
            </div>
            {hasHeaderBadges ? (
              <ProjectHeaderBadgeGroup badges={headerBadgeItems} badgeGroupCss={styles.badgeGroup} />
            ) : null}
            <div
              className="appMenuBar__globalActions"
              css={styles.globalActions}
              data-test-subj="kibanaProjectHeaderAppMenuGlobalActions"
            >
              <EuiButtonIcon
                aria-label={i18n.translate('core.ui.chrome.appMenu.editButtonAriaLabel', {
                  defaultMessage: 'Edit',
                })}
                color="text"
                css={styles.iconButtonSubdued}
                data-test-subj="kibanaProjectHeaderAppMenuEdit"
                display="empty"
                iconType="pencil"
                onClick={noop}
                size="xs"
                type="button"
              />
              <EuiButtonIcon
                aria-label={i18n.translate('core.ui.chrome.appMenu.shareButtonAriaLabel', {
                  defaultMessage: 'Share',
                })}
                color="text"
                css={styles.iconButtonSubdued}
                data-test-subj="kibanaProjectHeaderAppMenuShare"
                display="empty"
                iconType="share"
                onClick={noop}
                size="xs"
                type="button"
              />
              <EuiButtonIcon
                aria-label={i18n.translate('core.ui.chrome.appMenu.starButtonAriaLabel', {
                  defaultMessage: 'Favorite',
                })}
                color="text"
                css={styles.iconButtonSubdued}
                data-test-subj="kibanaProjectHeaderAppMenuStar"
                display="empty"
                iconType="starEmpty"
                onClick={noop}
                size="xs"
                type="button"
              />
            </div>
          </div>
          <div css={styles.menuSection} data-test-subj="kibanaProjectHeaderActionMenu">
            <HeaderProjectAppBarNavControls />
            {hasLegacyActionMenu && <HeaderActionMenu />}
            <HeaderAppMenu baseItems={globalOverflowItems} />
          </div>
        </div>
        {hasHeaderMetadata ? (
          <EuiFlexGroup
            alignItems="center"
            data-test-subj="kibanaProjectHeaderMetadata"
            wrap
            css={styles.metadataRow}
          >
            {headerMetadataItems.map((node, index) => (
              <EuiFlexItem key={index} grow={false} css={styles.metadataItem}>
                {node}
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ) : null}
        {headerTabs && headerTabs.length > 0 ? (
          <div css={styles.tabsRow}>
            <AppMenuBarHeaderTabs tabs={headerTabs} />
          </div>
        ) : null}
      </div>
    </>
  );
});
