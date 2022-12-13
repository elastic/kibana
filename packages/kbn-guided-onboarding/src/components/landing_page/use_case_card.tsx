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

type UseCaseConstants = {
  [key in UseCase]: {
    logAltText: string;
    betaBadgeLabel: string;
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
  },
  observability: {
    logAltText: i18n.translate('guidedOnboardingPackage.gettingStarted.observability.iconName', {
      defaultMessage: 'Observability logo',
    }),
    betaBadgeLabel: i18n.translate(
      'guidedOnboardingPackage.gettingStarted.observability.betaBadgeLabel',
      {
        defaultMessage: 'observe',
      }
    ),
  },
  security: {
    logAltText: i18n.translate('guidedOnboardingPackage.gettingStarted.security.iconName', {
      defaultMessage: 'Security logo',
    }),
    betaBadgeLabel: i18n.translate(
      'guidedOnboardingPackage.gettingStarted.security.betaBadgeLabel',
      {
        defaultMessage: 'protect',
      }
    ),
  },
};

export type UseCase = 'search' | 'observability' | 'security';

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
  const getImageUrl = (imageName: UseCase) => {
    const imagePath = `/plugins/home/assets/solution_logos/${imageName}${
      isDarkTheme ? '_dark' : ''
    }.png`;

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
      image={<EuiImage src={getImageUrl(useCase)} alt={constants[useCase].logAltText} />}
      title={titleElement}
      description={description}
      footer={footer}
      betaBadgeProps={{
        label: constants[useCase].betaBadgeLabel,
      }}
    />
  );
};
