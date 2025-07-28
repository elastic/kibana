/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { Redirect, RouteComponentProps } from 'react-router-dom';
import { HashRouter as Router, Routes, Route } from '@kbn/shared-ux-router';
import { Home } from './home';
import { TutorialDirectory } from './tutorial_directory';
import { Tutorial } from './tutorial/tutorial';

import { getTutorial } from '../load_tutorials';
import { replaceTemplateStrings } from './tutorial/replace_template_strings';
import { getServices } from '../kibana_services';
import { FeatureCatalogueEntry, FeatureCatalogueSolution } from '../../services';

const REDIRECT_TO_INTEGRATIONS_TAB_IDS = ['all', 'logging', 'metrics', 'security'];

export interface HomeAppProps {
  directories: FeatureCatalogueEntry[];
  solutions: FeatureCatalogueSolution[];
}

export function HomeApp({ directories, solutions }: HomeAppProps) {
  const { application, getBasePath, addBasePath, environmentService, dataViewsService } =
    getServices();
  const environment = environmentService.getEnvironment();
  const isCloudEnabled = environment.cloud;

  const renderTutorialDirectory = (props: RouteComponentProps<{ tab: string }>) => {
    // Redirect to integrations app unless a specific tab that is still supported was specified.
    const tabId = props.match.params.tab;
    if (!tabId || REDIRECT_TO_INTEGRATIONS_TAB_IDS.includes(tabId)) {
      application.navigateToApp('integrations', { replace: true });
      return null;
    }

    return (
      <TutorialDirectory
        addBasePath={addBasePath}
        openTab={tabId}
        isCloudEnabled={isCloudEnabled}
      />
    );
  };

  const renderTutorial = (props: RouteComponentProps<{ id: string }>) => {
    return (
      <Tutorial
        addBasePath={addBasePath}
        isCloudEnabled={isCloudEnabled}
        getTutorial={getTutorial}
        replaceTemplateStrings={replaceTemplateStrings}
        tutorialId={props.match.params.id}
      />
    );
  };

  return (
    <I18nProvider>
      <Router>
        <Routes>
          <Route path="/tutorial/:id" render={renderTutorial} />
          <Route path="/tutorial_directory/:tab?" render={renderTutorialDirectory} />
          <Route exact path="/">
            <Home
              addBasePath={addBasePath}
              directories={directories}
              solutions={solutions}
              localStorage={localStorage}
              urlBasePath={getBasePath()}
              hasUserDataView={() => dataViewsService.hasUserDataView()}
              isCloudEnabled={isCloudEnabled}
            />
          </Route>
          <Redirect to="/" />
        </Routes>
      </Router>
    </I18nProvider>
  );
}
