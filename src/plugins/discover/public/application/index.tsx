/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';
import { discoverRouter } from './discover_router';
import { DiscoverServices } from '../build_services';

export const renderApp = (element: HTMLElement, services: DiscoverServices) => {
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
  const unmount = toMountPoint(wrapWithTheme(discoverRouter(services, history), core.theme.theme$))(
    element
  );

  return () => {
    unmount();
    data.search.session.clear();
  };
};
