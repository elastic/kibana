/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactNode } from 'react';
import { EuiCard, EuiText, EuiImage } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GuideCardUseCase } from './guide_card';

type UseCaseConstants = {
  [key in UseCase]: {
    logAltText: string;
    betaBadgeLabel: string;
    imageUrlPrefix: string;
  };
};
const constants: UseCaseConstants = {
  search: {
    logAltText: i18n.translate('guidedOnboardingPackage.gettingStarted.search.iconName', {
      defaultMessage: 'Enterprise Search logo',
    }),
    betaBadgeLabel: i18n.translate('guidedOnboardingPackage.gettingStarted.search.betaBadgeLabel', {
      defaultMessage: 'search',
    }),
    imageUrlPrefix: '/plugins/home/assets/solution_logos/search',
  },
  kubernetes: {
    logAltText: i18n.translate('guidedOnboardingPackage.gettingStarted.kubernetes.iconName', {
      defaultMessage: 'Observability logo',
    }),
    betaBadgeLabel: i18n.translate(
      'guidedOnboardingPackage.gettingStarted.kubernetes.betaBadgeLabel',
      {
        defaultMessage: 'observe',
      }
    ),
    imageUrlPrefix: '/plugins/home/assets/solution_logos/kubernetes',
  },
  infrastructure: {
    logAltText: i18n.translate('guidedOnboardingPackage.gettingStarted.infrastructure.iconName', {
      defaultMessage: 'Observability logo',
    }),
    betaBadgeLabel: i18n.translate(
      'guidedOnboardingPackage.gettingStarted.infrastructure.betaBadgeLabel',
      {
        defaultMessage: 'observe',
      }
    ),
    imageUrlPrefix: '/plugins/home/assets/solution_logos/observability',
  },
  siem: {
    logAltText: i18n.translate('guidedOnboardingPackage.gettingStarted.siem.iconName', {
      defaultMessage: 'Security logo',
    }),
    betaBadgeLabel: i18n.translate('guidedOnboardingPackage.gettingStarted.siem.betaBadgeLabel', {
      defaultMessage: 'protect',
    }),
    imageUrlPrefix: '/plugins/home/assets/solution_logos/security',
  },
};

export type UseCase = GuideCardUseCase | 'infrastructure';

export interface UseCaseCardProps {
  useCase: UseCase;
  title: string;
  description: string;
  footer: ReactNode;
  isDarkTheme: boolean;
  addBasePath: (url: string) => string;
}

export const UseCaseCard = ({
  useCase,
  title,
  description,
  footer,
  isDarkTheme,
  addBasePath,
}: UseCaseCardProps) => {
  const getImageUrl = (imageUrlPrefix: string) => {
    const imagePath = `${imageUrlPrefix}${isDarkTheme ? '_dark' : ''}.png`;
    return addBasePath(imagePath);
  };

  const titleElement = (
    <EuiText textAlign="center">
      <h4>
        <strong>{title}</strong>
      </h4>
    </EuiText>
  );

  return (
    <EuiCard
      image={
        <EuiImage
          src={getImageUrl(constants[useCase].imageUrlPrefix)}
          alt={constants[useCase].logAltText}
          size={200}
          margin="s"
        />
      }
      title={titleElement}
      description={description}
      footer={footer}
      paddingSize="l"
      betaBadgeProps={{
        label: constants[useCase].betaBadgeLabel,
      }}
    />
  );
};
