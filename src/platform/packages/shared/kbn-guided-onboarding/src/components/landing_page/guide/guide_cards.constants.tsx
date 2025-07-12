/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { ReactNode } from 'react';
import { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { GuideId } from '../../../..';
import { GuideCardSolutions } from './guide_cards';
export interface GuideCardConstants {
  solution: GuideCardSolutions;
  title: string | ReactNode;
  // if present, guideId indicates which guide is opened when clicking the card
  guideId?: GuideId;
  // duplicate the telemetry id from the guide config to not load the config from the endpoint
  // this might change if we decide to use the guide config for the cards
  // see this issue https://github.com/elastic/kibana/issues/146672
  telemetryId: string;
  order: number;
  icon: string;
  // the guide will open a specific modal ESApiModal
  openEndpointModal?: boolean;
  url?: string;
}

export const getGuideCards = (
  application: ApplicationStart,
  locator?: LocatorPublic<ObservabilityOnboardingLocatorParams>
): GuideCardConstants[] =>
  [
    {
      solution: 'search',
      icon: 'pivot',
      title: i18n.translate('guidedOnboardingPackage.gettingStarted.cards.elasticsearchApi.title', {
        defaultMessage: 'Connect to the Elasticsearch API',
      }),
      telemetryId: 'onboarding--search--elasticsearchEndpointApi',
      order: 1,
      openEndpointModal: true,
    },
    {
      solution: 'search',
      icon: 'database',
      title: (
        <FormattedMessage
          id="guidedOnboardingPackage.gettingStarted.cards.databaseSearch.title"
          defaultMessage="Search across databases {lineBreak} and business systems"
          values={{
            lineBreak: <br />,
          }}
        />
      ),
      guideId: 'databaseSearch',
      telemetryId: 'onboarding--search--database',
      order: 1,
    },
    {
      solution: 'search',
      icon: 'vector',
      title: i18n.translate('guidedOnboardingPackage.gettingStarted.cards.vectorSearch.title', {
        defaultMessage: 'Set up vector search',
      }),
      url: application.getUrlForApp('enterpriseSearchVectorSearch'),
      telemetryId: 'onboarding--search--vector',
      order: 4,
    },
    {
      solution: 'search',
      icon: 'magnifyWithPlus',
      title: i18n.translate('guidedOnboardingPackage.gettingStarted.cards.aiSearch.title', {
        defaultMessage: 'Build an AI-powered search experience',
      }),
      url: application.getUrlForApp('enterpriseSearchAISearch'),
      telemetryId: 'onboarding--search--ai',
      order: 7,
    },
    {
      solution: 'security',
      icon: 'securitySignal',
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
      icon: 'inputOutput',
      title: (
        <FormattedMessage
          id="guidedOnboardingPackage.gettingStarted.cards.hostsSecurity.title"
          defaultMessage="Secure my hosts with {lineBreak} endpoint security"
          values={{
            lineBreak: <br />,
          }}
        />
      ),
      url: application.getUrlForApp('integrations', { path: '/detail/endpoint/overview' }),
      telemetryId: 'onboarding--security--hosts',
      order: 6,
    },
    {
      solution: 'security',
      icon: 'lock',
      title: (
        <FormattedMessage
          id="guidedOnboardingPackage.gettingStarted.cards.cloudSecurity.title"
          defaultMessage="Secure my cloud assets with cloud {lineBreak} security posture management (CSPM)"
          values={{
            lineBreak: <br />,
          }}
        />
      ),
      url: application.getUrlForApp('integrations', {
        path: '/detail/cloud_security_posture/overview?integration=cspm',
      }),
      telemetryId: 'onboarding--security--cloud',
      order: 9,
    },
  ].sort((cardA, cardB) => cardA.order - cardB.order) as GuideCardConstants[];
