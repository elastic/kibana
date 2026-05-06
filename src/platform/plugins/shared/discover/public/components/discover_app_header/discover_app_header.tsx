/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { ChromeAppHeaderRegistration } from '@kbn/app-header';
import type { AppHeaderBack } from '@kbn/app-header';

export interface DiscoverAppHeaderProps {
  title: string;
  back?: string | AppHeaderBack;
  appMenu?: AppMenuConfig;
}

export const DiscoverAppHeader: React.FC<DiscoverAppHeaderProps> = ({ title, back, appMenu }) => (
  <ChromeAppHeaderRegistration title={title} back={back} menu={appMenu} />
);
