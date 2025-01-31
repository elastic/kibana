/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { ExperimentalFeatures } from '../../server/config';
import { DiscoverRouter } from './discover_router';
import { DiscoverServices } from '../build_services';
import type { DiscoverCustomizationContext } from '../customizations';

export interface RenderAppProps {
  element: HTMLElement;
  services: DiscoverServices;
  customizationContext: DiscoverCustomizationContext;
  experimentalFeatures: ExperimentalFeatures;
}

export const renderApp = ({
  element,
  services,
  customizationContext,
  experimentalFeatures,
}: RenderAppProps) => {
  const { history, capabilities, chrome, data, core } = services;

  if (!capabilities.discover_v2.save) {
    chrome.setBadge({
      text: i18n.translate('discover.badge.readOnly.text', {
        defaultMessage: 'Read only',
      }),
      tooltip: i18n.translate('discover.badge.readOnly.tooltip', {
        defaultMessage: 'Unable to save Discover sessions',
      }),
      iconType: 'glasses',
    });
  }
  const unmount = toMountPoint(
    <DiscoverRouter
      services={services}
      customizationContext={customizationContext}
      experimentalFeatures={experimentalFeatures}
      history={history}
    />,
    core
  )(element);

  return () => {
    unmount();
    data.search.session.clear();
  };
};
