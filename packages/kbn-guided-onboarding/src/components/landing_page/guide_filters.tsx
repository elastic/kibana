/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
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
interface GuideFiltersProps {
  activeFilter: GuideFilterValues;
  setActiveFilter: React.Dispatch<React.SetStateAction<GuideFilterValues>>;
}
export const GuideFilters = ({ activeFilter, setActiveFilter }: GuideFiltersProps) => {
  const { euiTheme } = useEuiTheme();
  const activeFilterFill = css`
    background: ${euiTheme.colors.darkestShade};
    color: ${euiTheme.colors.lightestShade};
  `;

  return (
    <EuiFlexGroup justifyContent="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={() => setActiveFilter('all')}
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
          onClick={() => setActiveFilter('search')}
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
          onClick={() => setActiveFilter('observability')}
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
          onClick={() => setActiveFilter('security')}
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
