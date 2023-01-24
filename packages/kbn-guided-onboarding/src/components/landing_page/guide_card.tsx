/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { ApplicationStart } from '@kbn/core-application-browser';
import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import { GuideId } from '../../types';

const cardCss = css`
  position: relative;
  min-height: 110px;
  width: 380px;
  .euiCard__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
`;
interface GuideCardConstants {
  solution: 'search' | 'observability' | 'security';
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

const guideCards: GuideCardConstants[] = [
  {
    solution: 'search',
    title: i18n.translate('home.guidedOnboarding.gettingStarted.cards.appSearch.title', {
      defaultMessage: 'Build an application on top of Elasticsearch',
    }),
    guideId: 'search',
    telemetryId: 'guided-onboarding--search--application',
    order: 1,
  },
  {
    solution: 'search',
    title: i18n.translate('home.guidedOnboarding.gettingStarted.cards.websiteSearch.title', {
      defaultMessage: 'Add search to your website',
    }),
    guideId: 'search',
    telemetryId: 'guided-onboarding--search--website',
    order: 4,
  },
  {
    solution: 'search',
    title: i18n.translate('home.guidedOnboarding.gettingStarted.cards.databaseSearch.title', {
      defaultMessage: 'Search across databases and business systems',
    }),
    guideId: 'search',
    telemetryId: 'guided-onboarding--search--database',
    order: 7,
  },
  {
    solution: 'observability',
    title: i18n.translate('home.guidedOnboarding.gettingStarted.cards.logsObservability.title', {
      defaultMessage: 'Monitor logs',
    }),
    navigateTo: {
      appId: 'observability',
      path: '/overview',
    },
    telemetryId: 'guided-onboarding--observability--logs',
    order: 2,
  },
  {
    solution: 'observability',
    title: i18n.translate('home.guidedOnboarding.gettingStarted.cards.apmObservability.title', {
      defaultMessage: 'Monitor my application performance (APM/tracing)',
    }),
    navigateTo: {
      appId: 'observability',
      path: '/overview',
    },
    telemetryId: 'guided-onboarding--observability--apm',
    order: 5,
  },
  {
    solution: 'observability',
    title: i18n.translate('home.guidedOnboarding.gettingStarted.cards.hostsObservability.title', {
      defaultMessage: 'Monitor hosts',
    }),
    navigateTo: {
      appId: 'observability',
      path: '/overview',
    },
    telemetryId: 'guided-onboarding--observability--hosts',
    order: 8,
  },
  {
    solution: 'observability',
    title: i18n.translate(
      'home.guidedOnboarding.gettingStarted.cards.kubernetesObservability.title',
      {
        defaultMessage: 'Monitor kubernetes clusters',
      }
    ),
    guideId: 'kubernetes',
    telemetryId: 'guided-onboarding--observability--kubernetes',
    order: 11,
  },
  {
    solution: 'security',
    title: i18n.translate('home.guidedOnboarding.gettingStarted.cards.siemSecurity.title', {
      defaultMessage: 'Detect threats in my data with SIEM',
    }),
    guideId: 'siem',
    telemetryId: 'guided-onboarding--security--siem',
    order: 3,
  },
  {
    solution: 'security',
    title: i18n.translate('home.guidedOnboarding.gettingStarted.cards.hostsSecurity.title', {
      defaultMessage: 'Secure my hosts',
    }),
    navigateTo: {
      appId: 'securitySolutionUI',
      path: '/overview',
    },
    telemetryId: 'guided-onboarding--security--hosts',
    order: 6,
  },
  {
    solution: 'security',
    title: i18n.translate('home.guidedOnboarding.gettingStarted.cards.cloudSecurity.title', {
      defaultMessage: 'Secure my cloud assets',
    }),
    navigateTo: {
      appId: 'securitySolutionUI',
      path: '/overview',
    },
    telemetryId: 'guided-onboarding--security--cloud',
    order: 9,
  },
].sort((cardA, cardB) => cardA.order - cardB.order) as GuideCardConstants[];

export interface GuideCardsProps {
  isLoading: boolean;
  activateGuide: (guideId: GuideId) => Promise<void>;
  navigateToApp: ApplicationStart['navigateToApp'];
}
export const GuideCards = ({ isLoading, activateGuide, navigateToApp }: GuideCardsProps) => {
  return (
    <EuiFlexGroup wrap responsive justifyContent="center">
      {guideCards.map((card, index) => {
        const onClick = async () => {
          console.log('card onclick handler');
          if (card.guideId) {
            await activateGuide(card.guideId);
          } else if (card.navigateTo) {
            await navigateToApp(card.navigateTo?.appId, {
              path: card.navigateTo.path,
            });
          }
        };
        return (
          <EuiFlexItem key={index} grow={false}>
            <EuiCard
              isDisabled={isLoading}
              onClick={onClick}
              css={cardCss}
              title={
                <>
                  <EuiSpacer size="s" />
                  <h3 style={{ fontWeight: 600 }}>{card.title}</h3>
                </>
              }
              titleSize="xs"
              betaBadgeProps={{
                label: card.solution,
              }}
            />
            <EuiSpacer size="m" />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
