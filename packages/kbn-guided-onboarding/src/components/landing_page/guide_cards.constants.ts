/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { GuideId } from '../../..';
import { GuideCardSolutions } from './guide_cards';

interface GuideCardConstants {
  solution: GuideCardSolutions;
  title: string;
  // if present, guideId indicates which guide is opened when clicking the card
  guideId?: GuideId;
  // if present, navigateTo indicates where the user will be redirected, when clicking the card
  navigateTo?: {
    appId: string;
    path?: string;
  };
  // duplicate the telemetry id from the guide config to not load the config from the endpoint
  // this might change if we decide to use the guide config for the cards
  // see this issue https://github.com/elastic/kibana/issues/146672
  telemetryId: string;
  order: number;
}

export const guideCards: GuideCardConstants[] = [
  {
    solution: 'search',
    title: i18n.translate('guidedOnboardingPackage.gettingStarted.cards.appSearch.title', {
      defaultMessage: 'Build an application on top of Elasticsearch',
    }),
    guideId: 'search',
    telemetryId: 'guided-onboarding--search--application',
    order: 1,
  },
  {
    solution: 'search',
    title: i18n.translate('guidedOnboardingPackage.gettingStarted.cards.websiteSearch.title', {
      defaultMessage: 'Add search to my website',
    }),
    guideId: 'search',
    telemetryId: 'guided-onboarding--search--website',
    order: 4,
  },
  {
    solution: 'search',
    title: i18n.translate('guidedOnboardingPackage.gettingStarted.cards.databaseSearch.title', {
      defaultMessage: 'Search across databases and business systems',
    }),
    guideId: 'search',
    telemetryId: 'guided-onboarding--search--database',
    order: 7,
  },
  {
    solution: 'observability',
    title: i18n.translate('guidedOnboardingPackage.gettingStarted.cards.logsObservability.title', {
      defaultMessage: 'Collect and analyze my logs',
    }),
    navigateTo: {
      appId: 'integrations',
      path: '/browse?q=log',
    },
    telemetryId: 'guided-onboarding--observability--logs',
    order: 2,
  },
  {
    solution: 'observability',
    title: i18n.translate('guidedOnboardingPackage.gettingStarted.cards.apmObservability.title', {
      defaultMessage: 'Monitor my application performance (APM / tracing)',
    }),
    navigateTo: {
      appId: 'home',
      path: '#/tutorial/apm',
    },
    telemetryId: 'guided-onboarding--observability--apm',
    order: 5,
  },
  {
    solution: 'observability',
    title: i18n.translate('guidedOnboardingPackage.gettingStarted.cards.hostsObservability.title', {
      defaultMessage: 'Monitor my host metrics',
    }),
    navigateTo: {
      appId: 'integrations',
      path: '/browse/os_system',
    },
    telemetryId: 'guided-onboarding--observability--hosts',
    order: 8,
  },
  {
    solution: 'observability',
    title: i18n.translate(
      'guidedOnboardingPackage.gettingStarted.cards.kubernetesObservability.title',
      {
        defaultMessage: 'Monitor Kubernetes clusters',
      }
    ),
    guideId: 'kubernetes',
    telemetryId: 'guided-onboarding--observability--kubernetes',
    order: 11,
  },
  {
    solution: 'security',
    title: i18n.translate('guidedOnboardingPackage.gettingStarted.cards.siemSecurity.title', {
      defaultMessage: 'Detect threats in my data with SIEM',
    }),
    guideId: 'siem',
    telemetryId: 'guided-onboarding--security--siem',
    order: 3,
  },
  {
    solution: 'security',
    title: i18n.translate('guidedOnboardingPackage.gettingStarted.cards.hostsSecurity.title', {
      defaultMessage: 'Secure my hosts with endpoint security',
    }),
    navigateTo: {
      appId: 'integrations',
      path: '/detail/endpoint/overview',
    },
    telemetryId: 'guided-onboarding--security--hosts',
    order: 6,
  },
  {
    solution: 'security',
    title: i18n.translate('guidedOnboardingPackage.gettingStarted.cards.cloudSecurity.title', {
      defaultMessage: 'Secure my cloud assets with posture management',
    }),
    navigateTo: {
      appId: 'integrations',
      path: '/detail/cloud_security_posture/overview',
    },
    telemetryId: 'guided-onboarding--security--cloud',
    order: 9,
  },
].sort((cardA, cardB) => cardA.order - cardB.order) as GuideCardConstants[];
