/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { METRIC_TYPE } from '@kbn/analytics';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-components';

import { getServices } from '../../kibana_services';
import { UseCaseCard } from './use_case_card';

import './getting_started.scss';

export const GettingStarted = () => {
  const { application, trackUiMetric, chrome } = getServices();

  useEffect(() => {
    chrome.setBreadcrumbs([
      {
        // using # prevents a reloading of the whole app when clicking the breadcrumb
        href: '#',
        text: i18n.translate('home.breadcrumbs.homeTitle', { defaultMessage: 'Home' }),
        // TODO telemetry for navigating away from getting started via breadcrumbs
        onClick: () => {
          trackUiMetric(METRIC_TYPE.CLICK, 'guided_onboarding__home_breadcrumb');
        },
      },
      {
        text: i18n.translate('home.breadcrumbs.gettingStartedTitle', {
          defaultMessage: 'Getting Started',
        }),
      },
    ]);
  }, [chrome]);

  const onSkip = () => {
    // TODO telemetry for guided onboarding
    trackUiMetric(METRIC_TYPE.CLICK, 'guided_onboarding__skipped');
    application.navigateToApp('home');
  };
  return (
    <KibanaPageTemplate template="centeredBody">
        <EuiTitle size="l" className="eui-textCenter">
          <h1>
            <FormattedMessage
              id="home.guidedOnboarding.gettingStarted.useCaseSelectionTitle"
              defaultMessage="What would you like to do first?"
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s" textAlign="center">
          <p>
            <FormattedMessage
              id="home.guidedOnboarding.gettingStarted.useCaseSelectionSubtitle"
              defaultMessage="Select an option below to get a quick tour of the most valuable features based on your preferences."
            />
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiSpacer size="xxl" />
        <EuiFlexGrid columns={3} gutterSize="xl">
          <EuiFlexItem>
            <UseCaseCard useCase="search" />
          </EuiFlexItem>
          <EuiFlexItem>
            <UseCaseCard useCase="observability" />
          </EuiFlexItem>
          <EuiFlexItem>
            <UseCaseCard useCase="security" />
          </EuiFlexItem>
        </EuiFlexGrid>
        <EuiSpacer />
        <EuiHorizontalRule />
        <EuiSpacer />
        <div className="eui-textCenter">
          <EuiLink onClick={onSkip}>
            <FormattedMessage
              id="home.guidedOnboarding.gettingStarted.skip.buttonLabel"
              defaultMessage="I'd like to do something else (Skip)"
            />
          </EuiLink>
        </div>
      </EuiPanel>
    </KibanaPageTemplate>
  );
};
