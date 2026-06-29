/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Interpolation, Theme } from '@emotion/react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { EuiBreadcrumb } from '@elastic/eui';
import { EuiButtonEmpty, EuiIcon } from '@elastic/eui';
import type { AppHeaderBack, AppHeaderBadge } from '@kbn/app-header';
import { AppHeader } from '@kbn/app-header';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { TopNavMenuProps } from '@kbn/navigation-plugin/public';
import type { ViewMode } from '@kbn/presentation-publishing';
import {
  getDashboardBreadcrumb,
  topNavStrings,
} from '../../dashboard_app/_dashboard_app_strings';
import type { DashboardRedirect } from '../../dashboard_app/types';
import type { DashboardApi } from '../../dashboard_api/types';
import { openSettingsFlyout } from '../../dashboard_renderer/settings/open_settings_flyout';
import { DashboardFavoriteButton } from '../dashboard_favorite_button';
import { DashboardApplicationAttachmentButton } from './dashboard_application_attachment_button';
import { useIsChromeNextProjectHeader } from './use_is_chrome_next_project_header';

export interface DashboardChromeAppHeaderProps {
  dashboardTitle: string;
  viewMode: ViewMode;
  lastSavedId?: string;
  redirectTo: DashboardRedirect;
  customLeadingBreadCrumbs?: EuiBreadcrumb[];
  menu?: AppMenuConfig;
  badges: TopNavMenuProps['badges'];
  dashboardApi: DashboardApi;
  updateEditButtonCss?: Interpolation<Theme>;
}

export const DashboardChromeAppHeader = ({
  dashboardTitle,
  viewMode,
  lastSavedId,
  redirectTo,
  customLeadingBreadCrumbs = [],
  menu,
  badges,
  dashboardApi,
  updateEditButtonCss,
}: DashboardChromeAppHeaderProps) => {
  const isChromeNextProjectHeader = useIsChromeNextProjectHeader();

  const back = useMemo((): AppHeaderBack | undefined => {
    const leadingBreadcrumb = customLeadingBreadCrumbs[0];
    if (leadingBreadcrumb?.onClick) {
      return {
        href: leadingBreadcrumb.href ?? '#',
        label: String(leadingBreadcrumb.text),
        onClick: (event) => {
          event.preventDefault();
          (leadingBreadcrumb.onClick as (breadcrumbEvent: React.MouseEvent) => void)(event);
        },
      };
    }

    return {
      href: '#/list',
      label: getDashboardBreadcrumb(),
      onClick: (event) => {
        event.preventDefault();
        redirectTo({ destination: 'listing' });
      },
    };
  }, [customLeadingBreadCrumbs, redirectTo]);

  const appHeaderBadges = useMemo((): AppHeaderBadge[] | undefined => {
    if (!badges?.length) {
      return undefined;
    }

    return badges.map((badge) => ({
      label: badge.badgeText ?? '',
      color: badge.color as AppHeaderBadge['color'],
      tooltip: badge.toolTipProps?.content as string | undefined,
      onClick: badge.onClick
        ? () => {
            (badge.onClick as () => void)();
          }
        : undefined,
      onClickAriaLabel: badge.onClickAriaLabel,
      'data-test-subj': badge['data-test-subj'] as string | undefined,
      renderCustomBadge: badge.renderCustomBadge,
    }));
  }, [badges]);

  const titleAppend =
    viewMode === 'edit'
      ? (
          <EuiButtonEmpty
            onClick={() => openSettingsFlyout(dashboardApi)}
            size="xs"
            aria-label={topNavStrings.settings.description}
            color="text"
            textProps={false}
            css={updateEditButtonCss}
          >
            <EuiIcon size="s" type="pencil" aria-hidden={true} />
          </EuiButtonEmpty>
        )
      : undefined;

  if (!isChromeNextProjectHeader) {
    return null;
  }

  return (
    <div
      css={css`
        position: relative;
      `}
    >
      <AppHeader
        title={dashboardTitle}
        back={back}
        menu={menu}
        badges={appHeaderBadges}
        favorite={<DashboardFavoriteButton dashboardId={lastSavedId} />}
        titleActionAppend={<DashboardApplicationAttachmentButton />}
        titleAppend={titleAppend}
        sticky={false}
        padding="s"
      />
    </div>
  );
};
