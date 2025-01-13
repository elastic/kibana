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
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ApplicationStart } from '@kbn/core-application-browser';
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
export type GuideFilterValues = GuideCardSolutions | 'all';
export interface GuideFiltersProps {
  activeFilter: GuideFilterValues;
  setActiveFilter: React.Dispatch<React.SetStateAction<GuideFilterValues>>;
  application: ApplicationStart;
}
export const GuideFilters = ({ activeFilter, setActiveFilter, application }: GuideFiltersProps) => {
  const { euiTheme } = useEuiTheme();
  const activeFilterFill = css`
    background: ${euiTheme.colors.darkestShade};
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
  };

  return (
    <EuiFlexGroup justifyContent="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={onSelectFilter}
          data-filter-id="all"
          color="text"
          css={[filterButtonCss, activeFilter === 'all' && activeFilterFill]}
        >
          <FormattedMessage
            id="guidedOnboardingPackage.gettingStarted.guideFilter.all.buttonLabel"
            defaultMessage="All"
          />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={onSelectFilter}
          data-filter-id="search"
          color="text"
          css={[filterButtonCss, activeFilter === 'search' && activeFilterFill]}
        >
          <FormattedMessage
            id="guidedOnboardingPackage.gettingStarted.guideFilter.search.buttonLabel"
            defaultMessage="Elasticsearch"
          />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={onSelectFilter}
          data-filter-id="observability"
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
