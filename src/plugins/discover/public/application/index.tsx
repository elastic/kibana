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
import { registerGlobalKeyboardShortcuts } from '@kbn/keyboard-shortcut-utils';
import type { Observable } from 'rxjs';
import { ExperimentalFeatures } from '../../common/config';
import { DiscoverRouter } from './discover_router';
import { DiscoverServices } from '../build_services';
import type { DiscoverCustomizationContext } from '../customizations';

export interface RenderAppProps {
  element: HTMLElement;
  services: DiscoverServices;
  customizationContext$: Observable<DiscoverCustomizationContext>;
  experimentalFeatures: ExperimentalFeatures;
}

export const renderApp = ({
  element,
  services,
  customizationContext$,
  experimentalFeatures,
}: RenderAppProps) => {
  const { history, capabilities, chrome, data, core } = services;

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
      customizationContext$={customizationContext$}
      experimentalFeatures={experimentalFeatures}
      history={history}
    />,
    core
  )(element);

  const unregisterKbShortcuts = registerGlobalKeyboardShortcuts({
    core,
    appName: 'Discover', // TODO i18n
    copyPaste: {
      topicId: 'timerange',
      onCopy: () => services.data.query.timefilter.timefilter.getTime(),
      onPaste: (timeRange) => services.data.query.timefilter.timefilter.setTime(timeRange),
    },
  });

  return () => {
    unregisterKbShortcuts();
    unmount();
    data.search.session.clear();
  };
};
