/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { AppMenuLoading } from '@kbn/ui-app-menu';
import type { AppHeaderViewProps } from './app_header';
import type { AppHeaderSpacing } from './types';
import { AppHeaderShell } from './app_header_shell';
import { TitleArea } from './title_area';
import { AppHeaderSkeletonTitle } from './app_header_skeleton';

/**
 * Optional menu-skeleton customization. Omit the whole `menu` prop to get the default
 * overflow + primary placeholders.
 */
export interface AppHeaderLoadingMenu {
  /**
   * App menu button placeholders on the left (overflow / secondary actions).
   * Defaults to 1. Clamped to `APP_MENU_ITEM_LIMIT` (3) from `@kbn/ui-app-menu` —
   * the max visible left-side slots. The primary action does not count toward this.
   */
  buttonCount?: number;
  /** Primary-action app menu button. Defaults to `true`. */
  hasPrimary?: boolean;
}

export type AppHeaderLoadingViewProps = Pick<AppHeaderViewProps, 'back' | 'sticky'> & {
  menu?: AppHeaderLoadingMenu;
  /**
   * Defaults to `standard` so the skeleton matches a typical title + app menu header.
   */
  spacing?: AppHeaderSpacing;
};

export const AppHeaderLoadingView = React.memo<AppHeaderLoadingViewProps>(
  ({ back, menu, sticky, spacing = 'standard' }) => {
    const titleSize = spacing === 'compact' ? 'xs' : 's';

    return (
      <AppHeaderShell
        title={<TitleArea back={back} size={titleSize} placeholder={<AppHeaderSkeletonTitle />} />}
        trailing={<AppMenuLoading buttonCount={menu?.buttonCount} hasPrimary={menu?.hasPrimary} />}
        sticky={sticky}
        spacing={spacing}
      />
    );
  }
);

AppHeaderLoadingView.displayName = 'AppHeaderLoadingView';
