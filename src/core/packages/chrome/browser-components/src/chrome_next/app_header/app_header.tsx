/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { AppHeaderShell } from './app_header_shell';
import { AppBadges } from './app_badges';
import { TitleArea } from './title_area';
import { GlobalActions } from './global_actions';
import { AppMenu } from './app_menu';

export const AppHeader = React.memo(() => (
  <AppHeaderShell
    title={<TitleArea />}
    badges={<AppBadges />}
    titleActions={<GlobalActions />}
    trailing={<AppMenu />}
  />
));

AppHeader.displayName = 'AppHeader';
