/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { GuideState } from '../../types';
import { GuideCardFooter } from './guide_card_footer';
import { UseCaseCard } from './use_case_card';

// separate type for GuideCardUseCase that includes some of GuideIds
export type GuideCardUseCase = 'search' | 'kubernetes' | 'siem';
type GuideCardConstants = {
  [key in GuideCardUseCase]: {
    i18nTexts: {
      title: string;
      description: string;
    };
    // duplicate the telemetry id from the guide config to not load the config from the endpoint
    // this might change if we decide to use the guide config for the cards
    // see this issue https://github.com/elastic/kibana/issues/146672
    telemetryId: string;
  };
};

const constants: GuideCardConstants = {
  search: {
    i18nTexts: {
      title: i18n.translate('guidedOnboardingPackage.gettingStarted.guideCard.search.cardTitle', {
        defaultMessage: 'Search my data',
      }),
      description: i18n.translate(
        'guidedOnboardingPackage.gettingStarted.guideCard.search.cardDescription',
        {
          defaultMessage:
            'Create a search experience for your websites, applications, workplace content, or anything in between.',
        }
      ),
    },
    telemetryId: 'search',
  },
  kubernetes: {
    i18nTexts: {
      title: i18n.translate(
        'guidedOnboardingPackage.gettingStarted.guideCard.kubernetes.cardTitle',
        {
          defaultMessage: 'Observe my Kubernetes infrastructure',
        }
      ),
      description: i18n.translate(
        'guidedOnboardingPackage.gettingStarted.guideCard.kubernetes.cardDescription',
        {
          defaultMessage:
            'Monitor your Kubernetes infrastructure by consolidating your logs and metrics.',
        }
      ),
    },
    telemetryId: 'kubernetes',
  },
  siem: {
    i18nTexts: {
      title: i18n.translate('guidedOnboardingPackage.gettingStarted.guideCard.siem.cardTitle', {
        defaultMessage: 'Protect my environment',
      }),
      description: i18n.translate(
        'guidedOnboardingPackage.gettingStarted.guideCard.siem.cardDescription',
        {
          defaultMessage:
            'Investigate threats and get your SIEM up and running by installing the Elastic Defend integration.',
        }
      ),
    },
    telemetryId: 'siem',
  },
};

export interface GuideCardProps {
  useCase: GuideCardUseCase;
  guides: GuideState[];
  activateGuide: (useCase: GuideCardUseCase, guide?: GuideState) => Promise<void>;
  isDarkTheme: boolean;
  addBasePath: (url: string) => string;
}
export const GuideCard = ({
  useCase,
  guides,
  activateGuide,
  isDarkTheme,
  addBasePath,
}: GuideCardProps) => {
  return (
    <UseCaseCard
      useCase={useCase}
      title={constants[useCase].i18nTexts.title}
      description={constants[useCase].i18nTexts.description}
      footer={
        <GuideCardFooter
          guides={guides}
          activateGuide={activateGuide}
          useCase={useCase}
          telemetryId={constants[useCase].telemetryId}
        />
      }
      isDarkTheme={isDarkTheme}
      addBasePath={addBasePath}
    />
  );
};
