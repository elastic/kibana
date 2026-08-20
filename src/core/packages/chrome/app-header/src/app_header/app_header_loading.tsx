/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  AppHeaderLoadingView as AppHeaderLoadingPresentation,
  type AppHeaderLoadingMenu,
} from '@kbn/ui-app-header';
import type { AppHeaderBack, AppHeaderSpacing } from '../types';
import { useBackNavTargets, useInlineAppHeader } from './hooks';

export type { AppHeaderLoadingMenu };

export interface AppHeaderLoadingProps {
  back?: AppHeaderBack | AppHeaderBack[];
  menu?: AppHeaderLoadingMenu;
  /**
   * Uses CSS `position: sticky` to keep title and back visible while the page scrolls. Defaults to
   * `true`; set `false` only when the surrounding layout already pins the header in the correct
   * scroll container. A header-height wrapper prevents CSS sticky.
   */
  sticky?: boolean;
  /**
   * Controls the horizontal inset. Defaults to `standard` so the skeleton matches a
   * typical title + app menu header.
   */
  spacing?: AppHeaderSpacing;
}

/**
 * Loading-state header view without claiming the inline slot. Prefer {@link AppHeaderLoading}.
 */
export const AppHeaderLoadingView = React.memo<AppHeaderLoadingProps>((props) => {
  const back = useBackNavTargets(props.back);
  return <AppHeaderLoadingPresentation {...props} back={back} />;
});

AppHeaderLoadingView.displayName = 'AppHeaderLoadingView';

/**
 * Loading placeholder for {@link AppHeader}. Mounts in the same inline slot and skeletons the
 * title and app menu with defaults that match a typical title + overflow + primary header.
 */
export const AppHeaderLoading = React.memo<AppHeaderLoadingProps>((props) => {
  useInlineAppHeader();
  return <AppHeaderLoadingView {...props} />;
});

AppHeaderLoading.displayName = 'AppHeaderLoading';
