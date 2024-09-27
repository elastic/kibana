/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { NodeDefinitionWithChildren } from '@kbn/core-chrome-browser';
import type { DeepLinkId } from '@kbn/deeplinks-analytics';

export type NavigationID = 'rootNav:analytics' | 'root';

export type AnalyticsNodeDefinition = NodeDefinitionWithChildren<DeepLinkId, NavigationID>;

export const defaultNavigation: AnalyticsNodeDefinition = {
  id: 'rootNav:analytics',
  title: i18n.translate('defaultNavigation.analytics.dataExploration', {
    defaultMessage: 'Data exploration',
  }),
  icon: 'stats',
  renderAs: 'accordion',
  children: [
    {
      link: 'discover',
    },
    {
      link: 'dashboards',
    },
    {
      link: 'visualize',
    },
  ],
};
