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
      solution: 'observability',
      icon: 'logstashInput',
      title: i18n.translate(
        'guidedOnboardingPackage.gettingStarted.cards.logsObservability.title',
        {
          defaultMessage: 'Collect and analyze my logs',
        }
      ),
      url:
        locator?.getRedirectUrl({
          source: 'auto-detect',
          category: 'host',
        }) ?? '',
      telemetryId: 'onboarding--observability--logs',
      order: 2,
    },
    {
      solution: 'observability',
      icon: 'apmTrace',
      title: (
        <FormattedMessage
          id="guidedOnboardingPackage.gettingStarted.cards.apmObservability.title"
          defaultMessage="Monitor my application {lineBreak} performance (APM / tracing)"
          values={{
            lineBreak: <br />,
          }}
        />
      ),
      url: application.getUrlForApp('apm', { path: '/tutorial' }),
      telemetryId: 'onboarding--observability--apm',
      order: 5,
    },
    {
      solution: 'observability',
      icon: 'visBarVertical',
      title: i18n.translate(
        'guidedOnboardingPackage.gettingStarted.cards.hostsObservability.title',
        {
          defaultMessage: 'Monitor my host metrics',
        }
      ),
      url:
        locator?.getRedirectUrl({
          source: 'auto-detect',
          category: 'host',
        }) ?? '',
      telemetryId: 'onboarding--observability--hosts',
      order: 8,
    },
    {
      solution: 'observability',
      icon: 'cluster',
      title: i18n.translate(
        'guidedOnboardingPackage.gettingStarted.cards.kubernetesObservability.title',
        {
          defaultMessage: 'Monitor Kubernetes clusters',
        }
      ),
      url:
        locator?.getRedirectUrl({
          source: 'kubernetes',
          category: 'host',
        }) ?? '',
      telemetryId: 'onboarding--observability--kubernetes',
      order: 11,
    },
    {
      solution: 'observability',
      icon: 'videoPlayer',
      title: i18n.translate(
        'guidedOnboardingPackage.gettingStarted.cards.syntheticsObservability.title',
        {
          defaultMessage: 'Create a Synthetic Monitor',
        }
      ),
      url: application.getUrlForApp('synthetics', { path: '/monitors/getting-started' }),
      telemetryId: 'onboarding--observability--synthetics',
      order: 14,
    },
    {
      solution: 'observability',
      icon: 'visBarHorizontal',
      title: i18n.translate(
        'guidedOnboardingPackage.gettingStarted.cards.universalProfilingObservability.title',
        { defaultMessage: 'Optimize my workloads with Universal Profiling' }
      ),
      url: application.getUrlForApp('profiling', { path: '/add-data-instructions' }),
      telemetryId: 'onboarding--observability--profiling',
      order: 15,
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
