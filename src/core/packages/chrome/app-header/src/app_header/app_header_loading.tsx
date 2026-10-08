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
  type AppHeaderLoadingViewProps,
} from '@kbn/ui-app-header';
import { useBackNavTargets, useInlineAppHeader } from './hooks';

export type { AppHeaderLoadingMenu } from '@kbn/ui-app-header';
export type AppHeaderLoadingProps = AppHeaderLoadingViewProps;

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
