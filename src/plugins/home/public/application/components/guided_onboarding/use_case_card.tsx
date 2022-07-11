/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiCard, EuiText, EuiTitle } from '@elastic/eui';

import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';

import { getServices } from '../../kibana_services';

type UseCaseConstants = {
  [key in UseCase]: {
    i18nTexts: {
      title: string;
      description: string;
    };
    logo: {
      name: string;
      altText: string;
    };
    navigateOptions: {
      appId: string;
      path?: string;
    };
  };
};
const constants: UseCaseConstants = {
  search: {
    i18nTexts: {
      title: i18n.translate('home.guidedOnboarding.gettingStarted.search.cardTitle', {
        defaultMessage: 'Search my data',
      }),
      description: i18n.translate('home.guidedOnboarding.gettingStarted.search.cardDescription', {
        defaultMessage:
          'Create a finely-tuned search experience for your websites, applications, workplace content, and more.',
      }),
    },
    logo: {
      name: 'illustration-search',
      altText: i18n.translate('home.guidedOnboarding.gettingStarted.search.iconName', {
        defaultMessage: 'Enterprise Search logo',
      }),
    },
    navigateOptions: {
      appId: 'enterpriseSearch',
      // when navigating to ent search, do not provide path
    },
  },
  observability: {
    i18nTexts: {
      title: i18n.translate('home.guidedOnboarding.gettingStarted.observability.cardTitle', {
        defaultMessage: 'Monitor my environments',
      }),
      description: i18n.translate(
        'home.guidedOnboarding.gettingStarted.observability.cardDescription',
        {
          defaultMessage:
            'Get end-to-end observability into your environments by consolidating your logs, metrics, and traces.',
        }
      ),
    },
    logo: {
      name: 'illustration-observability',
      altText: i18n.translate('home.guidedOnboarding.gettingStarted.observability.iconName', {
        defaultMessage: 'Observability logo',
      }),
    },
    navigateOptions: {
      appId: 'observability',
      path: '/overview',
    },
  },
  security: {
    i18nTexts: {
      title: i18n.translate('home.guidedOnboarding.gettingStarted.security.cardTitle', {
        defaultMessage: 'Protect my environment',
      }),
      description: i18n.translate('home.guidedOnboarding.gettingStarted.security.cardDescription', {
        defaultMessage:
          'Protect your environment against threats by unifying SIEM, endpoint security, and cloud security in one place.',
      }),
    },
    logo: {
      name: 'illustration-security',
      altText: i18n.translate('home.guidedOnboarding.gettingStarted.security.iconName', {
        defaultMessage: 'Security logo',
      }),
    },
    navigateOptions: {
      appId: 'securitySolutionUI',
      path: '/overview',
    },
  },
};

export type UseCase = 'search' | 'observability' | 'security';
export interface UseCaseProps {
  useCase: UseCase;
}

export const UseCaseCard = ({ useCase }: UseCaseProps) => {
  const { application, trackUiMetric, uiSettings, http } = getServices();

  const isDarkTheme = uiSettings.get('theme:darkMode');

  const getImageUrl = (imageName: string) => {
    const imagePath = isDarkTheme
      ? `/plugins/home/assets/solution_logos/${imageName}-dark.png`
      : `/plugins/home/assets/solution_logos/${imageName}.png`;

    return http.basePath.prepend(imagePath);
  };

  const onUseCaseSelection = () => {
    trackUiMetric(METRIC_TYPE.CLICK, `guided_onboarding__use_case__${useCase}`);

    localStorage.setItem(`guidedOnboarding.${useCase}.tourActive`, JSON.stringify(true));
    application.navigateToApp(constants[useCase].navigateOptions.appId, {
      path: constants[useCase].navigateOptions.path,
    });
  };

  const title = (
    <EuiTitle size="xs">
      <h4>
        <strong>{constants[useCase].i18nTexts.title}</strong>
      </h4>
    </EuiTitle>
  );
  const description = (
    <EuiText color="subdued" size="xs">
      <p>{constants[useCase].i18nTexts.description}</p>
    </EuiText>
  );
  return (
    <EuiCard
      display="subdued"
      textAlign="left"
      image={
        <img
          src={getImageUrl(constants[useCase].logo.name)}
          alt={constants[useCase].logo.altText}
        />
      }
      title={title}
      description={description}
      // Used for FS tracking
      data-test-subj={`onboarding--${useCase}UseCaseCard`}
      onClick={onUseCaseSelection}
    />
  );
};
