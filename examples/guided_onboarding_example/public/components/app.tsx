/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { Router, Switch, Route } from 'react-router-dom';

import {
  EuiPage,
  EuiPageBody,
  EuiPageContent_Deprecated as EuiPageContent,
  EuiPageHeader,
  EuiTitle,
} from '@elastic/eui';

import { CoreStart, ScopedHistory } from '@kbn/core/public';

import { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public/types';
import { StepTwo } from './step_two';
import { StepOne } from './step_one';
import { StepThree } from './step_three';
import { Main } from './main';

interface GuidedOnboardingExampleAppDeps {
  notifications: CoreStart['notifications'];
  guidedOnboarding: GuidedOnboardingPluginStart;
  history: ScopedHistory;
}

export const GuidedOnboardingExampleApp = (props: GuidedOnboardingExampleAppDeps) => {
  const { notifications, guidedOnboarding, history } = props;

  return (
    <I18nProvider>
      <EuiPage restrictWidth="1000px">
        <EuiPageBody>
          <EuiPageHeader>
            <EuiTitle size="l">
              <h1>
                <FormattedMessage
                  id="guidedOnboardingExample.title"
                  defaultMessage="Guided onboarding examples"
                />
              </h1>
            </EuiTitle>
          </EuiPageHeader>
          <EuiPageContent>
            <Router history={history}>
              <Switch>
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
              </Switch>
            </Router>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    </I18nProvider>
  );
};
