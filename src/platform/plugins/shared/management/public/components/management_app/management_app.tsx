/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './management_app.scss';

import React, { useState, useEffect, useCallback } from 'react';
import { BehaviorSubject, Observable } from 'rxjs';

import { i18n } from '@kbn/i18n';
import { AppMountParameters, ChromeBreadcrumb, ScopedHistory } from '@kbn/core/public';
import { CoreStart } from '@kbn/core/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';

import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaPageTemplate, KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
import useObservable from 'react-use/lib/useObservable';
import type { ChromeStyle } from '@kbn/core-chrome-browser';
import { AppContextProvider } from './management_context';
import {
  ManagementSection,
  MANAGEMENT_BREADCRUMB,
  MANAGEMENT_BREADCRUMB_NO_HREF,
} from '../../utils';
import { ManagementRouter } from './management_router';
import { managementSidebarNav } from '../management_sidebar_nav/management_sidebar_nav';
import { SectionsServiceStart, NavigationCardsSubject, AppDependencies } from '../../types';

interface ManagementAppProps {
  appBasePath: string;
  history: AppMountParameters['history'];
  dependencies: ManagementAppDependencies;
}

export interface ManagementAppDependencies {
  sections: SectionsServiceStart;
  kibanaVersion: string;
  coreStart: CoreStart;
  setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => void;
  isSidebarEnabled$: BehaviorSubject<boolean>;
  cardsNavigationConfig$: BehaviorSubject<NavigationCardsSubject>;
  chromeStyle$: Observable<ChromeStyle>;
}

export const ManagementApp = ({ dependencies, history, appBasePath }: ManagementAppProps) => {
  const { coreStart, setBreadcrumbs, isSidebarEnabled$, cardsNavigationConfig$, chromeStyle$ } =
    dependencies;
  const [selectedId, setSelectedId] = useState<string>('');
  const [sections, setSections] = useState<ManagementSection[]>();
  const isSidebarEnabled = useObservable(isSidebarEnabled$);
  const cardsNavigationConfig = useObservable(cardsNavigationConfig$);
  const chromeStyle = useObservable(chromeStyle$);

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

  const contextDependencies: AppDependencies = {
    appBasePath,
    sections,
    cardsNavigationConfig,
    kibanaVersion: dependencies.kibanaVersion,
    coreStart,
    chromeStyle,
  };

  return (
    <KibanaRenderContextProvider {...coreStart}>
      <RedirectAppLinks coreStart={dependencies.coreStart}>
        <AppContextProvider value={contextDependencies}>
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
              theme={coreStart.theme}
              setBreadcrumbs={setBreadcrumbsScoped}
              onAppMounted={onAppMounted}
              sections={sections}
              analytics={coreStart.analytics}
            />
          </KibanaPageTemplate>
        </AppContextProvider>
      </RedirectAppLinks>
    </KibanaRenderContextProvider>
  );
};
