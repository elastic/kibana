/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pricing } from '@kbn/pricing';
import type { AppCategory } from './app_category';

/** @public */
export const DEFAULT_APP_CATEGORIES: Record<string, AppCategory> = Object.freeze({
  kibana: {
    id: 'kibana',
    label: pricing.translate('core.ui.kibanaNavList.label', {
      defaultMessage: 'Analytics',
    }),
    euiIconType: 'logoKibana',
    order: 1000,
  },
  enterpriseSearch: {
    id: 'enterpriseSearch',
    label: pricing.translate('core.ui.searchNavList.label', {
      defaultMessage: 'Elasticsearch',
    }),
    order: 2000,
    euiIconType: 'logoElasticsearch',
  },
  observability: {
    id: 'observability',
    label: pricing.translate('core.ui.observabilityNavList.label', {
      defaultMessage: 'Observability',
    }),
    euiIconType: 'logoObservability',
    order: 3000,
  },
  security: {
    id: 'securitySolution',
    label: pricing.translate('core.ui.securityNavList.label', {
      defaultMessage: 'Security',
    }),
    order: 4000,
    euiIconType: 'logoSecurity',
  },
  chat: {
    id: 'chat',
    label: pricing.translate('core.ui.chatNavList.label', {
      defaultMessage: 'Workchat',
    }),
    order: 4500,
    euiIconType: 'logoElasticsearch',
  },
  management: {
    id: 'management',
    label: pricing.translate('core.ui.managementNavList.label', {
      defaultMessage: 'Management',
    }),
    order: 5000,
    euiIconType: 'managementApp',
  },
});
