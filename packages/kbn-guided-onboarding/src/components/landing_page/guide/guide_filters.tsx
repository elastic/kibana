/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { css } from '@emotion/react';
import { METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import { GuideFilterValuesClassic } from '../../../../classic';
import { GuideCardSolutions } from './guide_cards';

const filterButtonCss = css`
  border-radius: 20px !important;
  min-width: 0 !important;
  padding: 0 18px !important;
  height: 32px !important;
  &:hover {
    text-decoration: none !important;
    transform: none !important;
    transition: none !important;
  }
  &:focus {
    text-decoration: none;
  }
`;
export type GuideFilterValues = GuideCardSolutions;
export interface GuideFiltersProps {
  activeFilter: GuideFilterValues;
  setActiveFilter: React.Dispatch<
    React.SetStateAction<GuideFilterValues | GuideFilterValuesClassic>
  >;
  application: ApplicationStart;
  trackUiMetric: (type: UiCounterMetricType, eventNames: string | string[], count?: number) => void;
}
export const GuideFilters = ({
  activeFilter,
  setActiveFilter,
  application,
  trackUiMetric,
}: GuideFiltersProps) => {
  const { euiTheme } = useEuiTheme();
  const activeFilterFill = css`
    background: ${euiTheme.colors.primary};
    color: ${euiTheme.colors.lightestShade};
  `;

  const setQuerystringParams = ({ useCase }: { useCase: string }) => {
    application.navigateToApp('home', { path: `#/getting_started?useCase=${useCase}` });
  };
  const onSelectFilter = (e: React.BaseSyntheticEvent) => {
    const {
      currentTarget: { dataset },
    } = e;
    setQuerystringParams({ useCase: dataset.filterId });
    setActiveFilter(dataset.filterId);
    // capture the clicks based on the solution
    trackUiMetric(METRIC_TYPE.CLICK, `guided_onboarding_${dataset.filterId}`);
  };

  return (
    <EuiFlexGroup justifyContent="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={onSelectFilter}
          data-filter-id="search"
          data-test-subj="guide-filter-search"
          color="text"
          css={[filterButtonCss, activeFilter === 'search' && activeFilterFill]}
        >
          <FormattedMessage
            id="guidedOnboardingPackage.gettingStarted.guideFilter.search.buttonLabel"
            defaultMessage="Search"
          />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={onSelectFilter}
          data-filter-id="observability"
          data-test-subj="guide-filter-observability"
          color="text"
          css={[filterButtonCss, activeFilter === 'observability' && activeFilterFill]}
        >
          <FormattedMessage
            id="guidedOnboardingPackage.gettingStarted.guideFilter.observability.buttonLabel"
            defaultMessage="Observability"
          />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={onSelectFilter}
          data-filter-id="security"
          data-test-subj="guide-filter-security"
          color="text"
          css={[filterButtonCss, activeFilter === 'security' && activeFilterFill]}
        >
          <FormattedMessage
            id="guidedOnboardingPackage.gettingStarted.guideFilter.security.buttonLabel"
            defaultMessage="Security"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
