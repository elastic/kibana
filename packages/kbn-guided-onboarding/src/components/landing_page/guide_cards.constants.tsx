/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { ReactNode } from 'react';
import { GuideId } from '../../..';
import { GuideCardSolutions } from './guide_cards';

export interface GuideCardConstants {
  solution: GuideCardSolutions;
  title: string | ReactNode;
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
    title: (
      <FormattedMessage
        id="guidedOnboardingPackage.gettingStarted.cards.appSearch.title"
        defaultMessage="Build an application on {lineBreak} top of Elasticsearch"
        values={{
          lineBreak: <br />,
        }}
      />
    ),
    guideId: 'appSearch',
    telemetryId: 'onboarding--search--application',
    order: 1,
  },
  {
    solution: 'search',
    title: i18n.translate('guidedOnboardingPackage.gettingStarted.cards.websiteSearch.title', {
      defaultMessage: 'Add search to my website',
    }),
    guideId: 'websiteSearch',
    telemetryId: 'onboarding--search--website',
    order: 4,
  },
  {
    solution: 'search',
    title: (
      <FormattedMessage
        id="guidedOnboardingPackage.gettingStarted.cards.databaseSearch.title"
        defaultMessage="Search across databases and {lineBreak} business systems"
        values={{
          lineBreak: <br />,
        }}
      />
    ),
    guideId: 'databaseSearch',
    telemetryId: 'onboarding--search--database',
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
    telemetryId: 'onboarding--observability--logs',
    order: 2,
  },
  {
    solution: 'observability',
    title: (
      <FormattedMessage
        id="guidedOnboardingPackage.gettingStarted.cards.apmObservability.title"
        defaultMessage="Monitor my application {lineBreak} performance (APM / tracing)"
        values={{
          lineBreak: <br />,
        }}
      />
    ),
    navigateTo: {
      appId: 'home',
      path: '#/tutorial/apm',
    },
    telemetryId: 'onboarding--observability--apm',
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
    telemetryId: 'onboarding--observability--hosts',
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
    telemetryId: 'onboarding--observability--kubernetes',
    order: 11,
  },
  {
    solution: 'security',
    title: (
      <FormattedMessage
        id="guidedOnboardingPackage.gettingStarted.cards.siemSecurity.title"
        defaultMessage="Detect threats in my {lineBreak} data with SIEM"
        values={{
          lineBreak: <br />,
        }}
      />
    ),
    guideId: 'siem',
    telemetryId: 'onboarding--security--siem',
    order: 3,
  },
  {
    solution: 'security',
    title: (
      <FormattedMessage
        id="guidedOnboardingPackage.gettingStarted.cards.hostsSecurity.title"
        defaultMessage="Secure my hosts with {lineBreak} endpoint security"
        values={{
          lineBreak: <br />,
        }}
      />
    ),
    navigateTo: {
      appId: 'integrations',
      path: '/detail/endpoint/overview',
    },
    telemetryId: 'onboarding--security--hosts',
    order: 6,
  },
  {
    solution: 'security',
    title: (
      <FormattedMessage
        id="guidedOnboardingPackage.gettingStarted.cards.cloudSecurity.title"
        defaultMessage="Secure my cloud assets with {lineBreak} cloud security posture management (CSPM)"
        values={{
          lineBreak: <br />,
        }}
      />
    ),
    navigateTo: {
      appId: 'integrations',
      path: '/detail/cloud_security_posture/overview',
    },
    telemetryId: 'onboarding--security--cloud',
    order: 9,
  },
].sort((cardA, cardB) => cardA.order - cardB.order) as GuideCardConstants[];
