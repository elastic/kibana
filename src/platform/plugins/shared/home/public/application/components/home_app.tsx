/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RouteComponentProps } from 'react-router-dom';
import { Redirect } from 'react-router-dom';
import type { AuthenticatedUser } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { HashRouter as Router, Routes, Route } from '@kbn/shared-ux-router';
import { Home } from './home';
import { TutorialDirectory } from './tutorial_directory';
import { Tutorial } from './tutorial/tutorial';

import { getTutorial } from '../load_tutorials';
import { replaceTemplateStrings } from './tutorial/replace_template_strings';
import { getServices } from '../kibana_services';
import type { FeatureCatalogueEntry, FeatureCatalogueSolution } from '../../services';

const REDIRECT_TO_INTEGRATIONS_TAB_IDS = ['all', 'logging', 'metrics', 'security'];

export interface HomeAppProps {
  directories: FeatureCatalogueEntry[];
  solutions: FeatureCatalogueSolution[];
}

export function HomeApp({ directories, solutions }: HomeAppProps) {
  const {
    chrome,
    application,
    getBasePath,
    addBasePath,
    environmentService,
    dataViewsService,
    contentManagement,
  } = getServices();
  const { services } = useKibana();
  const environment = environmentService.getEnvironment();
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [dashboards, setDashboards] = useState<any[]>([]);
  const isCloudEnabled = environment.cloud;
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        if (services.security) {
          const user = await services.security.authc.getCurrentUser();
          setCurrentUser(user);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    };

    getCurrentUser();
  }, [services.security]);

  // Fetch all dashboards (no filtering)
  useEffect(() => {
    const fetchDashboards = async () => {
      if (!contentManagement) return;
      const response = await contentManagement.client.search({
        contentTypeId: 'dashboard',
        query: {},
        options: { spaces: ['*'], fields: ['title', 'description', 'createdBy'] },
      });
      const dashboardHits = (response as { hits: any[] }).hits;
      setDashboards(dashboardHits);
    };
    fetchDashboards();
  }, [contentManagement]);

  const recentlyAccessed = chrome.recentlyAccessed.get();
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
              recentlyAccessed={recentlyAccessed}
              addBasePath={addBasePath}
              directories={directories}
              solutions={solutions}
              localStorage={localStorage}
              urlBasePath={getBasePath()}
              hasUserDataView={() => dataViewsService.hasUserDataView()}
              isCloudEnabled={isCloudEnabled}
              currentUser={currentUser}
              dashboards={dashboards}
            />
          </Route>
          <Redirect to="/" />
        </Routes>
      </Router>
    </I18nProvider>
  );
}
