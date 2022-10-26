/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { pluginServices } from '../../services/plugin_services';

export function addHelpMenuToAppChrome() {
  const {
    chrome: { setHelpExtension },
    documentationLinks: { dashboardDocLink },
  } = pluginServices.getServices();
  setHelpExtension({
    appName: i18n.translate('dashboard.helpMenu.appName', {
      defaultMessage: 'Dashboards',
    }),
    links: [
      {
        linkType: 'documentation',
        href: `${dashboardDocLink}`,
      },
    ],
  });
}
