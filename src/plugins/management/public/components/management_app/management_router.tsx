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
import { ManagementSidebarNav } from '../management_sidebar_nav';
import { KibanaPageTemplate, KibanaPageTemplateProps } from '../../../../kibana_react/public';

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

  const solution: KibanaPageTemplateProps['solution'] = {
    name: i18n.translate('management.nav.label', {
      defaultMessage: 'Management',
    }),
    icon: 'managementApp',
    id: 'stack-management-nav-header',
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
                    <KibanaPageTemplate
                      {...rest}
                      solution={solution}
                      pageSideBar={
                        <ManagementSidebarNav
                          navId={solution.id}
                          selectedId={selectedId}
                          sections={sections}
                          history={history}
                        />
                      }
                    >
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
                <KibanaPageTemplate
                  {...rest}
                  solution={solution}
                  pageSideBar={
                    <ManagementSidebarNav
                      navId={solution.id}
                      selectedId={selectedId}
                      sections={sections}
                      history={history}
                    />
                  }
                >
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
