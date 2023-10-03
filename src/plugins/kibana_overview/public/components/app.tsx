/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreStart } from '@kbn/core/public';
import type { FeatureCatalogueEntry, FeatureCatalogueSolution } from '@kbn/home-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { FetchResult } from '@kbn/newsfeed-plugin/public';
import { Route, Routes } from '@kbn/shared-ux-router';
import React, { useEffect, useState } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';
import { Overview } from './overview';

interface KibanaOverviewAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
  newsfeed$?: Observable<FetchResult | null | void>;
  features$: Observable<FeatureCatalogueEntry[]>;
  solutions: FeatureCatalogueSolution[];
}

export const KibanaOverviewApp = ({
  basename,
  newsfeed$,
  features$,
  solutions,
}: KibanaOverviewAppDeps) => {
  const features = useObservable(features$, []);
  const [newsFetchResult, setNewsFetchResult] = useState<FetchResult | null | void>(null);

  useEffect(() => {
    if (newsfeed$) {
      const subscription = newsfeed$.subscribe((res: FetchResult | void | null) => {
        setNewsFetchResult(res);
      });

      return () => subscription.unsubscribe();
    }
  }, [newsfeed$]);

  return (
    <Router basename={basename}>
      <I18nProvider>
        <Routes>
          <Route exact path="/">
            <Overview {...{ newsFetchResult, solutions, features }} />
          </Route>
        </Routes>
      </I18nProvider>
    </Router>
  );
};
