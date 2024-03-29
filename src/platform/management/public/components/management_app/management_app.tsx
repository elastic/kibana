/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './management_app.scss';

import React, { useState, useEffect, useCallback } from 'react';
import { BehaviorSubject } from 'rxjs';

import { I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AppMountParameters, ChromeBreadcrumb, ScopedHistory } from '@kbn/core/public';
import { CoreStart } from '@kbn/core/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';

import { reactRouterNavigate, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaPageTemplate, KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
import useObservable from 'react-use/lib/useObservable';
import { AppContextProvider } from './management_context';
import {
  ManagementSection,
  MANAGEMENT_BREADCRUMB,
  MANAGEMENT_BREADCRUMB_NO_HREF,
} from '../../utils';
import { ManagementRouter } from './management_router';
import { managementSidebarNav } from '../management_sidebar_nav/management_sidebar_nav';
import { SectionsServiceStart, NavigationCardsSubject } from '../../types';

interface ManagementAppProps {
  appBasePath: string;
  history: AppMountParameters['history'];
  theme$: AppMountParameters['theme$'];
  dependencies: ManagementAppDependencies;
}

export interface ManagementAppDependencies {
  sections: SectionsServiceStart;
  kibanaVersion: string;
  coreStart: CoreStart;
  setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => void;
  isSidebarEnabled$: BehaviorSubject<boolean>;
  cardsNavigationConfig$: BehaviorSubject<NavigationCardsSubject>;
}

export const ManagementApp = ({
  dependencies,
  history,
  theme$,
  appBasePath,
}: ManagementAppProps) => {
  const { setBreadcrumbs, isSidebarEnabled$, cardsNavigationConfig$ } = dependencies;
  const [selectedId, setSelectedId] = useState<string>('');
  const [sections, setSections] = useState<ManagementSection[]>();
  const isSidebarEnabled = useObservable(isSidebarEnabled$);
  const cardsNavigationConfig = useObservable(cardsNavigationConfig$);

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

      // Clicking the Management breadcrumb to navigate back to the "root" only
      // makes sense if there's a management app open. So when one isn't open
      // this breadcrumb shouldn't be a clickable link.
      const managementBreadcrumb = crumbs.length
        ? MANAGEMENT_BREADCRUMB
        : MANAGEMENT_BREADCRUMB_NO_HREF;
      setBreadcrumbs([
        wrapBreadcrumb(managementBreadcrumb, history),
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

  const solution: KibanaPageTemplateProps['solutionNav'] | undefined = isSidebarEnabled
    ? {
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
      }
    : undefined;

  const contextDependencies = {
    appBasePath,
    sections,
    cardsNavigationConfig,
    kibanaVersion: dependencies.kibanaVersion,
  };

  return (
    <RedirectAppLinks coreStart={dependencies.coreStart}>
      <I18nProvider>
        <AppContextProvider value={contextDependencies}>
          <KibanaThemeProvider theme$={theme$}>
            <KibanaPageTemplate
              restrictWidth={false}
              solutionNav={solution}
              // @ts-expect-error Techincally `paddingSize` isn't supported but it is passed through,
              // this is a stop-gap for Stack managmement specifically until page components can be converted to template components
              mainProps={{ paddingSize: 'l' }}
              panelled
            >
              <ManagementRouter
                history={history}
                theme$={theme$}
                setBreadcrumbs={setBreadcrumbsScoped}
                onAppMounted={onAppMounted}
                sections={sections}
                analytics={dependencies.coreStart.analytics}
              />
            </KibanaPageTemplate>
          </KibanaThemeProvider>
        </AppContextProvider>
      </I18nProvider>
    </RedirectAppLinks>
  );
};
