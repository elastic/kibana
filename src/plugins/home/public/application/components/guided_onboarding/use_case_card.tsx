/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiAvatar, EuiCard, EuiText, EuiTitle } from '@elastic/eui';

import { METRIC_TYPE } from '@kbn/analytics';

import { getServices } from '../../kibana_services';

import { i18nTexts, iconTypes, navigateOptions } from './constants';

import './use_case_card.scss';

type UseCase = 'search' | 'observability' | 'security';

export const UseCaseCard = ({ useCase }: { useCase: UseCase }) => {
  const { application, trackUiMetric } = getServices();

  const onUseCaseSelection = () => {
    // TODO telemetry for guided onboarding
    trackUiMetric(METRIC_TYPE.CLICK, `guided_onboarding__use_case__${useCase}`);

    localStorage.setItem(`guidedOnboarding.${useCase}.tourActive`, JSON.stringify(true));
    application.navigateToApp(navigateOptions[useCase].appId, {
      path: navigateOptions[useCase].path,
    });
  };

  return (
    <EuiCard
      display="subdued"
      textAlign="left"
      icon={
        <EuiAvatar
          iconSize="xl"
          iconType={iconTypes[useCase]}
          name={`${useCase} icon`}
          color="plain"
          size="xl"
          className="gettingStarted__useCaseIcon"
        />
      }
      image={<div className={`homUseCaseCard homUseCaseCard--${useCase}`} />}
      title={
        <EuiTitle size="xs">
          <h4>
            <strong>{i18nTexts[useCase].title}</strong>
          </h4>
        </EuiTitle>
      }
      description={
        <EuiText color="subdued" size="xs">
          <p>{i18nTexts[useCase].description}</p>
        </EuiText>
      }
      onClick={onUseCaseSelection}
    />
  );
};
