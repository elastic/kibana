/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
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
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-components';

import './getting_started.scss';
import { UseCaseCard } from './use_case_card';

export const GettingStarted = () => {
  return (
    <KibanaPageTemplate template="empty">
      <EuiPanel className="gettingStarted__panel">
        <EuiTitle size="l" className="eui-textCenter">
          <h1>
            <FormattedMessage
              id="guidedOnboarding.gettingStarted.useCaseSelectionTitle"
              defaultMessage="What would you like to do first?"
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s" textAlign="center">
          <p>
            <FormattedMessage
              id="guidedOnboarding.gettingStarted.useCaseSelectionSubtitle"
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
          <EuiLink
            onClick={() => {
              // TODO navigate to home page and send telemetry data
            }}
          >
            <FormattedMessage
              id="guidedOnboarding.gettingStarted.skip.buttonLabel"
              defaultMessage="I'd like to do something else (Skip)"
            />
          </EuiLink>
        </div>
      </EuiPanel>
    </KibanaPageTemplate>
  );
};
