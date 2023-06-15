/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
// eslint-disable-next-line no-restricted-imports
import { Switch } from 'react-router-dom';
import { Routes as ReactRouterRoutes } from 'react-router-dom-v5-compat';

export const Routes = ({
  legacySwitch = true,
  children,
}: {
  legacySwitch: boolean;
  children: React.ReactNode;
}) =>
  legacySwitch ? <Switch>{children}</Switch> : <ReactRouterRoutes>{children}</ReactRouterRoutes>;
