/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPageTemplate,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import { css } from '@emotion/react';
import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { GuideState } from '@kbn/guided-onboarding-plugin/common/types';
import { getServices } from '../../kibana_services';
import { KEY_ENABLE_WELCOME } from '../home';
import { GuideCard } from './guide_card';
import { LinkCard } from './link_card';

const homeBreadcrumb = i18n.translate('home.breadcrumbs.homeTitle', { defaultMessage: 'Home' });
const gettingStartedBreadcrumb = i18n.translate('home.breadcrumbs.gettingStartedTitle', {
  defaultMessage: 'Getting Started',
});
const title = i18n.translate('home.guidedOnboarding.gettingStarted.useCaseSelectionTitle', {
  defaultMessage: 'What would you like to do first?',
});
const subtitle = i18n.translate('home.guidedOnboarding.gettingStarted.useCaseSelectionSubtitle', {
  defaultMessage:
    'Select a starting point for a quick tour of how Elastic can help you do even more with your data.',
});
const skipText = i18n.translate('home.guidedOnboarding.gettingStarted.skip.buttonLabel', {
  defaultMessage: `No thanks, I’ll explore on my own.`,
});

export const GettingStarted = () => {
  const { application, trackUiMetric, chrome, guidedOnboardingService } = getServices();
  const [guidesState, setGuidesState] = useState<GuideState[]>([]);

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

  const fetchGuidesState = useCallback(async () => {
    const allGuides = await guidedOnboardingService?.fetchAllGuidesState();
    if (allGuides) {
      setGuidesState(allGuides.state);
    }
  }, [guidedOnboardingService]);
  useEffect(() => {
    fetchGuidesState();
  }, [fetchGuidesState]);

  const onSkip = () => {
    trackUiMetric(METRIC_TYPE.CLICK, 'guided_onboarding__skipped');
    // disable welcome screen on the home page
    localStorage.setItem(KEY_ENABLE_WELCOME, JSON.stringify(false));
    application.navigateToApp('home');
  };
  const { euiTheme } = useEuiTheme();
  const paddingCss = css`
    padding: calc(${euiTheme.size.base}*3) calc(${euiTheme.size.base}*4);
  `;
  return (
    <KibanaPageTemplate panelled={false} grow>
      <EuiPageTemplate.Section alignment="center">
        <EuiPanel color="plain" hasShadow css={paddingCss}>
          <EuiTitle size="l" className="eui-textCenter">
            <h1>{title}</h1>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="m" textAlign="center">
            <p>{subtitle}</p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiSpacer size="xxl" />
          <EuiFlexGrid columns={4} gutterSize="l">
            <EuiFlexItem>
              <GuideCard useCase="search" guides={guidesState} />
            </EuiFlexItem>
            <EuiFlexItem>
              <GuideCard useCase="observability" guides={guidesState} />
            </EuiFlexItem>
            <EuiFlexItem>
              <LinkCard />
            </EuiFlexItem>
            <EuiFlexItem>
              <GuideCard useCase="security" guides={guidesState} />
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
        </EuiPanel>
      </EuiPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
