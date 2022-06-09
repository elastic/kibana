/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-components';

import './getting_started.scss';

export const GettingStarted = () => {
  return (
    <KibanaPageTemplate template="empty">
      <EuiPanel className="gettingStarted__panel">
        <EuiTitle>
          <h1>
            <FormattedMessage
              id="guidedOnboarding.gettingStarted.useCaseSelectionTitle"
              defaultMessage="What would you like to do first?"
            />
          </h1>
        </EuiTitle>
        <EuiText color="subdued" size="s">
          <p>
            <FormattedMessage
              id="guidedOnboarding.gettingStarted.useCaseSelectionSubtitle"
              defaultMessage="Select an option below to get a quick tour of the most valuable features based on your preferences."
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xxl" type="inspect" />}
              title={
                <FormattedMessage
                  id="guidedOnboarding.gettingStarted.search.cardTitle"
                  defaultMessage="Search my data"
                />
              }
              description={
                <FormattedMessage
                  id="guidedOnboarding.gettingStarted.search.cardDescription"
                  defaultMessage="Create a search experience for your websites, applications, workplace content, or anything in between."
                />
              }
              onClick={() => {}}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xxl" type="eye" />}
              title={
                <FormattedMessage
                  id="guidedOnboarding.gettingStarted.observability.cardTitle"
                  defaultMessage="Monitor my infrastructure"
                />
              }
              description={
                <FormattedMessage
                  id="guidedOnboarding.gettingStarted.observability.cardDescription"
                  defaultMessage="Monitor your infrastructure by consolidating your logs, metrics, and traces for end‑to‑end observability."
                />
              }
              onClick={() => {}}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xxl" type="securitySignal" />}
              title={
                <FormattedMessage
                  id="guidedOnboarding.gettingStarted.security.cardTitle"
                  defaultMessage="Protect my environment"
                />
              }
              description={
                <FormattedMessage
                  id="guidedOnboarding.gettingStarted.security.cardDescription"
                  defaultMessage="Protect your environment by unifying SIEM, endpoint security, and cloud security to protect against threats."
                />
              }
              onClick={() => {}}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiHorizontalRule />
        <EuiSpacer />
        <div className="eui-textCenter">
          <EuiLink onClick={() => {}}>
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
