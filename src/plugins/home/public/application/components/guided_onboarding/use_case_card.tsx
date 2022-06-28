/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import {
  EuiAvatar,
  EuiCard,
  EuiText,
  EuiTitle,
  IconType,
  useEuiTheme,
  useIsWithinBreakpoints,
} from '@elastic/eui';

import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';

import { getServices } from '../../kibana_services';

type UseCaseConstants = {
  [key in UseCase]: {
    i18nTexts: {
      title: string;
      description: string;
    };
    icon: {
      type: IconType;
      name: string;
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
          'Create a search experience for your websites, applications, workplace content, or anything in between.',
      }),
    },
    icon: {
      type: 'inspect',
      name: i18n.translate('home.guidedOnboarding.gettingStarted.search.iconName', {
        defaultMessage: 'Enterprise Search icon',
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
        defaultMessage: 'Monitor my infrastructure',
      }),
      description: i18n.translate(
        'home.guidedOnboarding.gettingStarted.observability.cardDescription',
        {
          defaultMessage:
            'Monitor your infrastructure by consolidating your logs, metrics, and traces for end‑to‑end observability.',
        }
      ),
    },
    icon: {
      type: 'eye',
      name: i18n.translate('home.guidedOnboarding.gettingStarted.observability.iconName', {
        defaultMessage: 'Observability icon',
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
          'Protect your environment by unifying SIEM, endpoint security, and cloud security to protect against threats.',
      }),
    },
    icon: {
      type: 'securitySignal',
      name: i18n.translate('home.guidedOnboarding.gettingStarted.security.iconName', {
        defaultMessage: 'Security icon',
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
  const { application, trackUiMetric } = getServices();

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

  const { euiTheme } = useEuiTheme();
  const isSmallerBreakpoint = useIsWithinBreakpoints(['xs', 's']);
  const isMediumBreakpoint = useIsWithinBreakpoints(['m']);
  const cardCss = useMemo(() => {
    return {
      backgroundColor:
        useCase === 'search'
          ? euiTheme.colors.warning
          : useCase === 'security'
          ? euiTheme.colors.accent
          : euiTheme.colors.success,
      // smaller screens: taller cards (250px)
      // medium screens: lower cards (150px)
      // larger screens: tall but not too tall cards (200px)
      minHeight: isSmallerBreakpoint ? 250 : isMediumBreakpoint ? 150 : 200,
    };
  }, [euiTheme, isMediumBreakpoint, isSmallerBreakpoint, useCase]);

  return (
    <EuiCard
      display="subdued"
      textAlign="left"
      icon={
        <EuiAvatar
          iconSize="xl"
          iconType={constants[useCase].icon.type}
          name={constants[useCase].icon.name}
          color="plain"
          size="xl"
          // TODO add useEuiShadow('m') when EUI import is available (https://github.com/elastic/eui/pull/5970)
        />
      }
      image={<div css={cardCss} />}
      title={title}
      description={description}
      // Used for FS tracking
      data-test-subj={`onboarding--${useCase}UseCaseCard`}
      onClick={onUseCaseSelection}
    />
  );
};
