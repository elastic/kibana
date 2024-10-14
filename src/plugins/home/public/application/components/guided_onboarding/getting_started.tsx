/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { parse } from 'query-string';
import {
  EuiButton,
  EuiLink,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { useHistory, useLocation } from 'react-router-dom';
import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import {
  GuideFilterValues,
  GuideCards,
  GuideFilters,
  GuideCardConstants,
  guideCards,
} from '@kbn/guided-onboarding/guide';
import {
  GuideCardsClassic,
  GuideFiltersClassic,
  guideCardsClassic,
  type GuideFilterValuesClassic,
} from '@kbn/guided-onboarding/classic';
import { GuideId, GuideState } from '@kbn/guided-onboarding/src/types';
import { getServices } from '../../kibana_services';
import { KEY_ENABLE_WELCOME } from '../home';

const homeBreadcrumb = i18n.translate('home.breadcrumbs.homeTitle', { defaultMessage: 'Home' });
const gettingStartedBreadcrumb = i18n.translate('home.breadcrumbs.gettingStartedTitle', {
  defaultMessage: 'Setup guides',
});
const title = i18n.translate('home.guidedOnboarding.gettingStarted.useCaseSelectionTitle', {
  defaultMessage: 'What would you like to do first?',
});
const subtitle = i18n.translate('home.guidedOnboarding.gettingStarted.useCaseSelectionSubtitle', {
  defaultMessage: `Filter by solution to see related use cases`,
});
const skipText = i18n.translate('home.guidedOnboarding.gettingStarted.skip.buttonLabel', {
  defaultMessage: `I’d like to explore on my own.`,
});

export const GettingStarted = () => {
  const { application, trackUiMetric, chrome, guidedOnboardingService, cloud } = getServices();

  const [guidesState, setGuidesState] = useState<GuideState[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [filteredCards, setFilteredCards] = useState<GuideCardConstants[]>();
  const { search } = useLocation();
  const query = parse(search);
  // using for A/B testing
  const [classicGuide] = useState<boolean>(false);
  const useCase = query.useCase as GuideFilterValues;
  const [filter, setFilter] = useState<GuideFilterValues | GuideFilterValuesClassic>(
    classicGuide ? useCase ?? 'all' : useCase ?? 'search'
  );

  const history = useHistory();

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
    setIsLoading(true);
    setIsError(false);
    try {
      const allGuides = await guidedOnboardingService?.fetchAllGuidesState();
      setIsLoading(false);
      if (allGuides) {
        setGuidesState(allGuides.state);
      }
    } catch (error) {
      setIsLoading(false);
      setIsError(true);
    }
  }, [guidedOnboardingService]);

  useEffect(() => {
    fetchGuidesState();
  }, [fetchGuidesState]);

  useEffect(() => {
    if (cloud?.isCloudEnabled === false) {
      return history.push('/');
    }
  }, [cloud, history]);

  useEffect(() => {
    // disable welcome screen on the home page
    localStorage.setItem(KEY_ENABLE_WELCOME, JSON.stringify(false));
  }, []);

  const onSkip = async () => {
    try {
      await guidedOnboardingService?.skipGuidedOnboarding();
    } catch (error) {
      // if the state update fails, it's safe to ignore the error
    }
    trackUiMetric(METRIC_TYPE.CLICK, 'guided_onboarding__skipped');
    application.navigateToApp('home');
  };

  const activateGuide = useCallback(
    async (guideId: GuideId, guideState?: GuideState) => {
      try {
        await guidedOnboardingService?.activateGuide(guideId, guideState);
      } catch (err) {
        getServices().toastNotifications.addDanger({
          title: i18n.translate('home.guidedOnboarding.gettingStarted.activateGuide.errorMessage', {
            defaultMessage: 'Unable to start the guide. Wait a moment and try again.',
          }),
          text: err.message,
        });
      }
    },
    [guidedOnboardingService]
  );

  // filter cards for solution and based on classic or new format
  const guide = classicGuide ? guideCardsClassic : guideCards;
  useEffect(() => {
    const tempFiltered = guide.filter(({ solution }) => solution === filter);
    setFilteredCards(tempFiltered);
  }, [filter, guide]);

  if (isLoading) {
    return (
      <KibanaPageTemplate.EmptyPrompt
        title={<EuiLoadingSpinner size="xl" />}
        body={
          <EuiText color="subdued">
            {i18n.translate('home.guidedOnboarding.gettingStarted.loadingIndicator', {
              defaultMessage: 'Loading the guide state...',
            })}
          </EuiText>
        }
        data-test-subj="onboarding--loadingIndicator"
      />
    );
  }

  if (isError) {
    return (
      <KibanaPageTemplate.EmptyPrompt
        iconType="warning"
        color="danger"
        title={
          <h2>
            {i18n.translate('home.guidedOnboarding.gettingStarted.errorSectionTitle', {
              defaultMessage: 'Unable to load the guide state',
            })}
          </h2>
        }
        body={
          <>
            <EuiText color="subdued">
              {i18n.translate('home.guidedOnboarding.gettingStarted.errorSectionDescription', {
                defaultMessage: `The guide couldn't be loaded. Wait a moment and try again.`,
              })}
            </EuiText>
            <EuiSpacer />
            <EuiButton
              iconSide="right"
              onClick={fetchGuidesState}
              iconType="refresh"
              color="danger"
            >
              {i18n.translate('home.guidedOnboarding.gettingStarted.errorSectionRefreshButton', {
                defaultMessage: 'Refresh',
              })}
            </EuiButton>
          </>
        }
        data-test-subj="onboarding--errorSection"
      />
    );
  }

  const setGuideFilters = classicGuide ? (
    <GuideFiltersClassic
      application={application}
      activeFilter={filter}
      setActiveFilter={setFilter}
      data-test-subj="onboarding--guideFilters"
    />
  ) : (
    <GuideFilters
      application={application}
      activeFilter={filter as GuideFilterValues}
      setActiveFilter={setFilter}
      data-test-subj="onboarding--guideFilters"
      trackUiMetric={trackUiMetric}
    />
  );

  const setGuideCards = classicGuide ? (
    <GuideCardsClassic
      activateGuide={activateGuide}
      navigateToApp={application.navigateToApp}
      activeFilter={filter as GuideFilterValues}
      guidesState={guidesState}
    />
  ) : (
    <GuideCards
      activateGuide={activateGuide}
      navigateToApp={application.navigateToApp}
      activeFilter={filter as GuideFilterValues}
      guidesState={guidesState}
      filteredCards={filteredCards}
    />
  );

  return (
    <KibanaPageTemplate panelled={false}>
      <EuiPageTemplate.Section data-test-subj="guided-onboarding--landing-page">
        <EuiTitle size="l" className="eui-textCenter">
          <h1>{title}</h1>
        </EuiTitle>
        <EuiSpacer size="l" />
        <EuiText size="m" textAlign="center">
          <p>{subtitle}</p>
        </EuiText>
        <EuiSpacer size="l" />
        {setGuideFilters}
        <EuiSpacer size="xxl" />
        {setGuideCards}
        <EuiSpacer size="xxl" />
        <div className="eui-textCenter">
          {/* data-test-subj used for FS tracking */}
          <EuiLink onClick={onSkip} data-test-subj="onboarding--skipGuideLink">
            {skipText}
          </EuiLink>
        </div>
      </EuiPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
