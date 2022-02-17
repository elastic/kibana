/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './management_app.scss';

import React, { useState, useEffect, useCallback } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AppMountParameters, ChromeBreadcrumb, ScopedHistory } from 'kibana/public';

import { ManagementSection, MANAGEMENT_BREADCRUMB } from '../../utils';
import { ManagementRouter } from './management_router';
import { managementSidebarNav } from '../management_sidebar_nav/management_sidebar_nav';
import {
  KibanaPageTemplate,
  KibanaPageTemplateProps,
  reactRouterNavigate,
  KibanaThemeProvider,
} from '../../../../kibana_react/public';
import { SectionsServiceStart } from '../../types';

interface ManagementAppProps {
  appBasePath: string;
  history: AppMountParameters['history'];
  theme$: AppMountParameters['theme$'];
  dependencies: ManagementAppDependencies;
}

export interface ManagementAppDependencies {
  sections: SectionsServiceStart;
  kibanaVersion: string;
  setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => void;
}

export const ManagementApp = ({ dependencies, history, theme$ }: ManagementAppProps) => {
  const { setBreadcrumbs } = dependencies;
  const [selectedId, setSelectedId] = useState<string>('');
  const [sections, setSections] = useState<ManagementSection[]>();

  const onAppMounted = useCallback((id: string) => {
    setSelectedId(id);
    window.scrollTo(0, 0);
  }, []);

  const setBreadcrumbsScoped = useCallback(
    (crumbs: ChromeBreadcrumb[] = [], appHistory?: ScopedHistory) => {
      const wrapBreadcrumb = (item: ChromeBreadcrumb, scopedHistory: ScopedHistory) => ({
        ...item,
        ...(item.href ? reactRouterNavigate(scopedHistory, item.href) : {}),
      });

      setBreadcrumbs([
        wrapBreadcrumb(MANAGEMENT_BREADCRUMB, history),
        ...crumbs.map((item) => wrapBreadcrumb(item, appHistory || history)),
      ]);
    },
    [setBreadcrumbs, history]
  );

  useEffect(() => {
    setSections(dependencies.sections.getSectionsEnabled());
  }, [dependencies.sections]);

  if (!sections) {
    return null;
  }

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
    <I18nProvider>
      <KibanaThemeProvider theme$={theme$}>
        <KibanaPageTemplate
          restrictWidth={false}
          // EUI TODO
          // The different template options need to be manually recreated by the individual pages.
          // These classes help enforce the layouts.
          pageContentProps={{ className: 'kbnAppWrapper' }}
          pageContentBodyProps={{ className: 'kbnAppWrapper' }}
          solutionNav={solution}
        >
          <ManagementRouter
            history={history}
            theme$={theme$}
            setBreadcrumbs={setBreadcrumbsScoped}
            onAppMounted={onAppMounted}
            sections={sections}
            dependencies={dependencies}
          />
        </KibanaPageTemplate>
      </KibanaThemeProvider>
    </I18nProvider>
  );
};
