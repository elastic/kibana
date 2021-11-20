/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ChromeStart, DocLinksStart } from 'kibana/public';

export function addHelpMenuToAppChrome(chrome: ChromeStart, docLinks: DocLinksStart) {
  chrome.setHelpExtension({
    appName: i18n.translate('discover.helpMenu.appName', {
      defaultMessage: 'Discover',
    }),
    links: [
      {
        linkType: 'documentation',
        href: `${docLinks.links.discover.guide}`,
      },
    ],
  });
}
