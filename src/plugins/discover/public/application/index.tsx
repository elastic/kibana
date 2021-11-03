/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { getServices } from '../kibana_services';
import { discoverRouter } from './discover_router';
import { toMountPoint } from '../../../kibana_react/public';

export const renderApp = (element: HTMLElement) => {
  const services = getServices();
  const { history: getHistory, capabilities, chrome, data } = services;

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
  const unmount = toMountPoint(discoverRouter(services, history))(element);

  return () => {
    unmount();
    data.search.session.clear();
  };
};
