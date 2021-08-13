/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import ReactDOM from 'react-dom';

import { AppMountParameters } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { getServices } from '../kibana_services';
import { discoverRouter } from './discover_router';

export const renderApp = ({ element }: AppMountParameters) => {
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
  const app = discoverRouter(services, history);
  ReactDOM.render(app, element);

  return () => {
    data.search.session.clear();
    ReactDOM.unmountComponentAtNode(element);
  };
};
