/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiAvatar, EuiCard, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import './use_case_card.scss';

const i18nTexts = {
  search: {
    title: i18n.translate('guidedOnboarding.gettingStarted.search.cardTitle', {
      defaultMessage: 'Search my data',
    }),
    description: i18n.translate('guidedOnboarding.gettingStarted.search.cardDescription', {
      defaultMessage:
        'Create a search experience for your websites, applications, workplace content, or anything in between.',
    }),
  },
  observability: {
    title: i18n.translate('guidedOnboarding.gettingStarted.observability.cardTitle', {
      defaultMessage: 'Monitor my infrastructure',
    }),
    description: i18n.translate('guidedOnboarding.gettingStarted.observability.cardDescription', {
      defaultMessage:
        'Monitor your infrastructure by consolidating your logs, metrics, and traces for end‑to‑end observability.',
    }),
  },
  security: {
    title: i18n.translate('guidedOnboarding.gettingStarted.security.cardTitle', {
      defaultMessage: 'Protect my environment',
    }),
    description: i18n.translate('guidedOnboarding.gettingStarted.security.cardDescription', {
      defaultMessage:
        'Protect your environment by unifying SIEM, endpoint security, and cloud security to protect against threats.',
    }),
  },
};

const iconTypes = {
  search: 'inspect',
  observability: 'eye',
  security: 'securitySignal',
};

type UseCase = 'search' | 'observability' | 'security';

const onUseCaseSelection = (useCase: UseCase) => {
  // TODO navigate to the correct solution landing page,
  // activate a product tour (if applicable), send telemetry
};

export const UseCaseCard = ({ useCase }: { useCase: UseCase }) => {
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
      image={<div className={`gettingStarted__useCaseCard gettingStarted__${useCase}`} />}
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
      onClick={() => {
        onUseCaseSelection(useCase);
      }}
    />
  );
};
