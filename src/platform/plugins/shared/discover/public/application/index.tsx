/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { AppMountParameters } from '@kbn/core/public';
import { DiscoverRouter } from './discover_router';
import type { DiscoverServices } from '../build_services';
import type { DiscoverCustomizationContext } from '../customizations';

export interface RenderAppProps {
  element: HTMLElement;
  onAppLeave: AppMountParameters['onAppLeave'];
  services: DiscoverServices;
  customizationContext: DiscoverCustomizationContext;
}

export const renderApp = ({
  element,
  onAppLeave,
  services,
  customizationContext,
}: RenderAppProps) => {
  const { data, core } = services;

  const unmount = toMountPoint(
    <DiscoverRouter
      onAppLeave={onAppLeave}
      services={services}
      customizationContext={customizationContext}
    />,
    core
  )(element);

  return () => {
    unmount();
    data.search.session.clear();
  };
};
