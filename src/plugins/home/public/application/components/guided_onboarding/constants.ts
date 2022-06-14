/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const i18nTexts = {
  search: {
    title: i18n.translate('home.guidedOnboarding.gettingStarted.search.cardTitle', {
      defaultMessage: 'Search my data',
    }),
    description: i18n.translate('home.guidedOnboarding.gettingStarted.search.cardDescription', {
      defaultMessage:
        'Create a search experience for your websites, applications, workplace content, or anything in between.',
    }),
  },
  observability: {
    title: i18n.translate('home.guidedOnboarding.gettingStarted.observability.cardTitle', {
      defaultMessage: 'Monitor my infrastructure',
    }),
    description: i18n.translate(
      'home.guidedOnboarding.gettingStarted.observability.cardDescription',
      {
        defaultMessage:
          'Monitor your infrastructure by consolidating your logs, metrics, and traces for end‑to‑end observability.',
      }
    ),
  },
  security: {
    title: i18n.translate('home.guidedOnboarding.gettingStarted.security.cardTitle', {
      defaultMessage: 'Protect my environment',
    }),
    description: i18n.translate('home.guidedOnboarding.gettingStarted.security.cardDescription', {
      defaultMessage:
        'Protect your environment by unifying SIEM, endpoint security, and cloud security to protect against threats.',
    }),
  },
};

export const iconTypes = {
  search: 'inspect',
  observability: 'eye',
  security: 'securitySignal',
};

export const navigateOptions = {
  search: {
    appId: 'enterpriseSearch',
    // when navigating to ent search, do not provide path
    path: undefined,
  },
  observability: {
    appId: 'observability',
    path: '/overview',
  },
  security: {
    appId: 'securitySolutionUI',
    path: '/overview',
  },
};
