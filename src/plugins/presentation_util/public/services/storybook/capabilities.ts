/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginServiceFactory } from '../create';
import { StorybookParams } from '.';
import { PresentationCapabilitiesService } from '..';

type CapabilitiesServiceFactory = PluginServiceFactory<
  PresentationCapabilitiesService,
  StorybookParams
>;

export const capabilitiesServiceFactory: CapabilitiesServiceFactory = ({
  canAccessDashboards,
  canCreateNewDashboards,
  canEditDashboards,
}) => {
  const check = (value: boolean = true) => value;
  return {
    canAccessDashboards: () => check(canAccessDashboards),
    canCreateNewDashboards: () => check(canCreateNewDashboards),
    canEditDashboards: () => check(canEditDashboards),
  };
};
