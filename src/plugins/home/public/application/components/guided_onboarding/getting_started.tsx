/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiAvatar,
  EuiCard,
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
            <EuiCard
              display="subdued"
              textAlign="left"
              icon={
                <EuiAvatar
                  iconSize="xl"
                  iconType="inspect"
                  name="Search icon"
                  color="plain"
                  size="xl"
                  className="gettingStarted__icon"
                />
              }
              image={<div className="gettingStarted__card gettingStarted__search" />}
              title={
                <EuiTitle size="xs">
                  <h4>
                    <strong>
                      <FormattedMessage
                        id="guidedOnboarding.gettingStarted.search.cardTitle"
                        defaultMessage="Search my data"
                      />
                    </strong>
                  </h4>
                </EuiTitle>
              }
              description={
                <EuiText color="subdued" size="xs">
                  <p>
                    <FormattedMessage
                      id="guidedOnboarding.gettingStarted.search.cardDescription"
                      defaultMessage="Create a search experience for your websites, applications, workplace content, or anything in between."
                    />
                  </p>
                </EuiText>
              }
              onClick={() => {}}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              display="subdued"
              textAlign="left"
              icon={
                <EuiAvatar
                  iconSize="xl"
                  iconType="eye"
                  name="Observability icon"
                  color="plain"
                  size="xl"
                  className="gettingStarted__icon"
                />
              }
              image={<div className="gettingStarted__card gettingStarted__observability" />}
              title={
                <EuiTitle size="xs">
                  <h4>
                    <strong>
                      <FormattedMessage
                        id="guidedOnboarding.gettingStarted.observability.cardTitle"
                        defaultMessage="Monitor my infrastructure"
                      />
                    </strong>
                  </h4>
                </EuiTitle>
              }
              description={
                <EuiText color="subdued" size="xs">
                  <p>
                    <FormattedMessage
                      id="guidedOnboarding.gettingStarted.observability.cardDescription"
                      defaultMessage="Monitor your infrastructure by consolidating your logs, metrics, and traces for end‑to‑end observability."
                    />
                  </p>
                </EuiText>
              }
              onClick={() => {}}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              display="subdued"
              textAlign="left"
              icon={
                <EuiAvatar
                  iconSize="xl"
                  iconType="securitySignal"
                  name="Security icon"
                  color="plain"
                  size="xl"
                  className="gettingStarted__icon"
                />
              }
              image={<div className="gettingStarted__card gettingStarted__security" />}
              title={
                <EuiTitle size="xs">
                  <h4>
                    <strong>
                      <FormattedMessage
                        id="guidedOnboarding.gettingStarted.security.cardTitle"
                        defaultMessage="Protect my environment"
                      />
                    </strong>
                  </h4>
                </EuiTitle>
              }
              description={
                <EuiText color="subdued" size="xs">
                  <p>
                    <FormattedMessage
                      id="guidedOnboarding.gettingStarted.security.cardDescription"
                      defaultMessage="Protect your environment by unifying SIEM, endpoint security, and cloud security to protect against threats."
                    />
                  </p>
                </EuiText>
              }
              onClick={() => {}}
            />
          </EuiFlexItem>
        </EuiFlexGrid>
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
