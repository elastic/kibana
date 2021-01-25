/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { VisTypeAlias } from 'src/plugins/visualizations/public';
import { DocLinksStart } from 'src/core/public';
import { APP_NAME, PLUGIN_ID_OSS, APP_PATH, APP_ICON } from '../common';

export const getMapsAliasConfig = ({ links }: DocLinksStart): VisTypeAlias => ({
  aliasPath: APP_PATH,
  aliasApp: APP_NAME,
  name: PLUGIN_ID_OSS,
  title: i18n.translate('mapsOss.visTypeAlias.title', {
    defaultMessage: 'Maps',
  }),
  description: i18n.translate('mapsOss.visTypeAlias.description', {
    defaultMessage: 'Plot and style your geo data in a multi layer map.',
  }),
  icon: APP_ICON,
  stage: 'production',
  disabled: true,
  promoTooltip: {
    description: i18n.translate('mapsOss.visTypeAlias.promoTooltip.description', {
      defaultMessage: 'Try maps for free with Elastic. Learn more.',
    }),
    link: `${links.visualize.maps}?blade=kibanaossvizwizard`,
  },
});
