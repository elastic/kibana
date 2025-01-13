/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { Routes, Router, Route } from '@kbn/shared-ux-router';
import { EuiPageTemplate } from '@elastic/eui';
import { CoreStart, ScopedHistory } from '@kbn/core/public';
import { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public/types';
import { StepTwo } from './step_two';
import { StepOne } from './step_one';
import { StepThree } from './step_three';
import { StepFour } from './step_four';
import { Main } from './main';

interface GuidedOnboardingExampleAppDeps {
  notifications: CoreStart['notifications'];
  guidedOnboarding: GuidedOnboardingPluginStart;
  history: ScopedHistory;
}

export const GuidedOnboardingExampleApp = (props: GuidedOnboardingExampleAppDeps) => {
  const { notifications, guidedOnboarding, history } = props;

  return (
    <EuiPageTemplate restrictWidth={true} panelled={true}>
      <EuiPageTemplate.Header
        pageTitle={
          <FormattedMessage
            id="guidedOnboardingExample.title"
            defaultMessage="Guided onboarding examples"
          />
        }
      />
      {guidedOnboarding?.guidedOnboardingApi?.isEnabled ? (
        <EuiPageTemplate.Section>
          <Router history={history}>
            <Routes>
              <Route exact path="/">
                <Main notifications={notifications} guidedOnboarding={guidedOnboarding} />
              </Route>
              <Route exact path="/stepOne">
                <StepOne guidedOnboarding={guidedOnboarding} />
              </Route>
              <Route exact path="/stepTwo">
                <StepTwo />
              </Route>
              <Route exact path="/stepThree">
                <StepThree guidedOnboarding={guidedOnboarding} />
              </Route>
              <Route path="/stepFour/:indexName?">
                <StepFour guidedOnboarding={guidedOnboarding} />
              </Route>
            </Routes>
          </Router>
        </EuiPageTemplate.Section>
      ) : (
        <EuiPageTemplate.EmptyPrompt
          iconType="error"
          color="danger"
          title={
            <h2>
              <FormattedMessage
                id="guidedOnboardingExample.errorTitle"
                defaultMessage="Guided onboarding is disabled"
              />
            </h2>
          }
          body={
            <p>
              <FormattedMessage
                id="guidedOnboardingExample.errorDescription"
                defaultMessage="Make sure your Kibana instance runs on Cloud and/or
                your user has access to Setup guides feature."
              />
            </p>
          }
        />
      )}
    </EuiPageTemplate>
  );
};
