/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import { Route, Router, Switch } from 'react-router-dom';
import { AppMountParameters, ChromeBreadcrumb, ScopedHistory } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { ManagementAppWrapper } from '../management_app_wrapper';
import { ManagementLandingPage } from '../landing';
import { ManagementAppDependencies } from './management_app';
import { ManagementSection } from '../../utils';
import { KibanaPageTemplate, KibanaPageTemplateProps } from '../../../../kibana_react/public';
import { managementSidebarNav } from '../management_sidebar_nav';

interface ManagementRouterProps {
  history: AppMountParameters['history'];
  dependencies: ManagementAppDependencies;
  setBreadcrumbs: (crumbs?: ChromeBreadcrumb[], appHistory?: ScopedHistory) => void;
  sections: ManagementSection[];
}

export const ManagementRouter = ({
  dependencies,
  history,
  setBreadcrumbs,
  sections,
}: ManagementRouterProps) => {
  const [selectedId, setSelectedId] = useState<string>('');
  const onAppMounted = useCallback((id: string) => {
    setSelectedId(id);
    window.scrollTo(0, 0);
  }, []);

  const solution: KibanaPageTemplateProps['solutionNav'] = {
    name: i18n.translate('management.nav.label', {
      defaultMessage: 'Management',
    }),
    icon: 'managementApp',
    'data-test-subj': 'mgtSideBarNav',
    items: managementSidebarNav({
      selectedId,
      sections,
      history,
    }),
  };

  return (
    <Router history={history}>
      <Switch>
        {sections.map((section) =>
          section.getAppsEnabled().map((app) => (
            <Route
              path={`${app.basePath}`}
              component={() => (
                <ManagementAppWrapper
                  app={app}
                  setBreadcrumbs={setBreadcrumbs}
                  onAppMounted={onAppMounted}
                  history={history}
                  managementPageLayout={({ children, ...rest }) => (
                    <KibanaPageTemplate {...rest} solutionNav={solution}>
                      {children}
                    </KibanaPageTemplate>
                  )}
                />
              )}
            />
          ))
        )}
        <Route
          path={'/'}
          component={() => (
            <ManagementLandingPage
              version={dependencies.kibanaVersion}
              setBreadcrumbs={setBreadcrumbs}
              managementPageLayout={({ children, ...rest }) => (
                <KibanaPageTemplate {...rest} solutionNav={solution}>
                  {children}
                </KibanaPageTemplate>
              )}
            />
          )}
        />
      </Switch>
    </Router>
  );
};
