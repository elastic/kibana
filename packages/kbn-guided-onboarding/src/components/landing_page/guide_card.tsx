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
import { UseCase, UseCaseCard } from './use_case_card';

type GuideCardConstants = {
  [key in UseCase]: {
    i18nTexts: {
      title: string;
      description: string;
    };
  };
};
const constants: GuideCardConstants = {
  search: {
    i18nTexts: {
      title: i18n.translate('home.guidedOnboarding.gettingStarted.guideCard.search.cardTitle', {
        defaultMessage: 'Search my data',
      }),
      description: i18n.translate(
        'home.guidedOnboarding.gettingStarted.guideCard.search.cardDescription',
        {
          defaultMessage:
            'Create a finely-tuned search experience for your websites, applications, workplace content, and more.',
        }
      ),
    },
  },
  observability: {
    i18nTexts: {
      title: i18n.translate(
        'home.guidedOnboarding.gettingStarted.guideCard.observability.cardTitle',
        {
          defaultMessage: 'Monitor my environments',
        }
      ),
      description: i18n.translate(
        'home.guidedOnboarding.gettingStarted.guideCard.observability.cardDescription',
        {
          defaultMessage:
            'Get end-to-end observability into your environments by consolidating your logs, metrics, and traces.',
        }
      ),
    },
  },
  security: {
    i18nTexts: {
      title: i18n.translate('home.guidedOnboarding.gettingStarted.guideCard.security.cardTitle', {
        defaultMessage: 'Protect my environment',
      }),
      description: i18n.translate(
        'home.guidedOnboarding.gettingStarted.guideCard.security.cardDescription',
        {
          defaultMessage:
            'Protect your environment against threats by unifying SIEM, endpoint security, and cloud security in one place.',
        }
      ),
    },
  },
};

export interface GuideCardProps {
  useCase: UseCase;
  guides: GuideState[];
  activateGuide: (useCase: UseCase, guide?: GuideState) => Promise<void>;
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
      footer={<GuideCardFooter guides={guides} activateGuide={activateGuide} useCase={useCase} />}
      isDarkTheme={isDarkTheme}
      addBasePath={addBasePath}
    />
  );
};
