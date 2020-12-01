/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
