/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { ScopedHistory, CoreStart, CoreTheme } from '@kbn/core/public';
import { Observable } from 'rxjs';
import {
  KibanaContextProvider,
  KibanaThemeProvider,
  RedirectAppLinks,
} from '@kbn/kibana-react-plugin/public';

import { SampleDataCardsKibanaProvider } from '@kbn/home-sample-data-cards';

// @ts-ignore
import { HomeApp } from './components/home_app';
import { getServices } from './kibana_services';

import './index.scss';

export const renderApp = async (
  element: HTMLElement,
  theme$: Observable<CoreTheme>,
  coreStart: CoreStart,
  history: ScopedHistory
) => {
  const homeTitle = i18n.translate('home.breadcrumbs.homeTitle', { defaultMessage: 'Home' });
  const { featureCatalogue, chrome, dataViewsService: dataViews } = getServices();

  // all the directories could be get in "start" phase of plugin after all of the legacy plugins will be moved to a NP
  const directories = featureCatalogue.get();

  // Filters solutions by available nav links
  const navLinksSubscription = chrome.navLinks.getNavLinks$().subscribe((navLinks) => {
    const solutions = featureCatalogue
      .getSolutions()
      .filter(({ id }) => navLinks.find(({ category, hidden }) => !hidden && category?.id === id));

    render(
      <RedirectAppLinks application={coreStart.application}>
        <KibanaThemeProvider theme$={theme$}>
          <KibanaContextProvider services={{ ...coreStart }}>
            <SampleDataCardsKibanaProvider {...{ coreStart, dataViews }}>
              <HomeApp directories={directories} solutions={solutions} />
            </SampleDataCardsKibanaProvider>
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </RedirectAppLinks>,
      element
    );
  });

  chrome.setBreadcrumbs([{ text: homeTitle }]);

  // dispatch synthetic hash change event to update hash history objects
  // this is necessary because hash updates triggered by using popState won't trigger this event naturally.
  // This must be called before the app is mounted to avoid call this after the redirect to default app logic kicks in
  const unlisten = history.listen((location) => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  return () => {
    unmountComponentAtNode(element);
    unlisten();
    navLinksSubscription.unsubscribe();
  };
};
