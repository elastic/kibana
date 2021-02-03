/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { CoreStart } from 'kibana/public';

export function addHelpMenuToAppChrome(
  chrome: CoreStart['chrome'],
  docLinks: CoreStart['docLinks']
) {
  chrome.setHelpExtension({
    appName: i18n.translate('dashboard.helpMenu.appName', {
      defaultMessage: 'Dashboards',
    }),
    links: [
      {
        linkType: 'documentation',
        href: `${docLinks.links.dashboard.guide}`,
      },
    ],
  });
}
