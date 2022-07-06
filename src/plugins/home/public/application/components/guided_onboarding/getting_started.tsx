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
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import { css } from '@emotion/react';
import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-components';

import { getServices } from '../../kibana_services';
import { UseCaseCard } from './use_case_card';

const homeBreadcrumb = i18n.translate('home.breadcrumbs.homeTitle', { defaultMessage: 'Home' });
const gettingStartedBreadcrumb = i18n.translate('home.breadcrumbs.gettingStartedTitle', {
  defaultMessage: 'Getting Started',
});
const title = i18n.translate('home.guidedOnboarding.gettingStarted.useCaseSelectionTitle', {
  defaultMessage: 'What would you like to do first?',
});
const subtitle = i18n.translate('home.guidedOnboarding.gettingStarted.useCaseSelectionSubtitle', {
  defaultMessage:
    'Select an option below to get a quick tour of the most valuable features based on your preferences.',
});
const skipText = i18n.translate('home.guidedOnboarding.gettingStarted.skip.buttonLabel', {
  defaultMessage: `I'd like to do something else (Skip)`,
});

export const GettingStarted = () => {
  const { application, trackUiMetric, chrome } = getServices();

  useEffect(() => {
    chrome.setBreadcrumbs([
      {
        // using # prevents a reloading of the whole app when clicking the breadcrumb
        href: '#',
        text: homeBreadcrumb,
        onClick: () => {
          trackUiMetric(METRIC_TYPE.CLICK, 'guided_onboarding__home_breadcrumb');
        },
      },
      {
        text: gettingStartedBreadcrumb,
      },
    ]);
  }, [chrome, trackUiMetric]);

  const onSkip = () => {
    trackUiMetric(METRIC_TYPE.CLICK, 'guided_onboarding__skipped');
    application.navigateToApp('home');
  };
  const { euiTheme } = useEuiTheme();
  const paddingCss = css`
    padding: calc(${euiTheme.size.base}*3) calc(${euiTheme.size.base}*4);
  `;
  return (
    <KibanaPageTemplate template="centeredBody">
      <div css={paddingCss}>
        <EuiTitle size="l" className="eui-textCenter">
          <h1>{title}</h1>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s" textAlign="center">
          <p>{subtitle}</p>
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
          {/* data-test-subj used for FS tracking */}
          <EuiLink onClick={onSkip} data-test-subj="onboarding--skipUseCaseTourLink">
            {skipText}
          </EuiLink>
        </div>
      </div>
    </KibanaPageTemplate>
  );
};
