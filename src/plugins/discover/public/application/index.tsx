/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { DiscoverRouter } from './discover_router';
import { DiscoverServices } from '../build_services';
import type { DiscoverProfileRegistry } from '../customizations/profile_registry';

export interface RenderAppProps {
  element: HTMLElement;
  services: DiscoverServices;
  profileRegistry: DiscoverProfileRegistry;
  isDev: boolean;
}

export const renderApp = ({ element, services, profileRegistry, isDev }: RenderAppProps) => {
  const { history: getHistory, capabilities, chrome, data, core } = services;

  const history = getHistory();
  if (!capabilities.discover.save) {
    chrome.setBadge({
      text: i18n.translate('discover.badge.readOnly.text', {
        defaultMessage: 'Read only',
      }),
      tooltip: i18n.translate('discover.badge.readOnly.tooltip', {
        defaultMessage: 'Unable to save searches',
      }),
      iconType: 'glasses',
    });
  }
  const unmount = toMountPoint(
    <DiscoverRouter
      services={services}
      profileRegistry={profileRegistry}
      history={history}
      isDev={isDev}
    />,
    {
      theme: core.theme,
      i18n: core.i18n,
    }
  )(element);

  return () => {
    unmount();
    data.search.session.clear();
  };
};
