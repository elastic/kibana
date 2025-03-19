/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './app.scss';
import React, { useEffect, useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';
import { EuiLoadingSpinner } from '@elastic/eui';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import { syncGlobalQueryStateWithUrl } from '@kbn/data-plugin/public';
import type { NoDataPagePluginStart } from '@kbn/no-data-page-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { withSuspense } from '@kbn/shared-ux-utility';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { VisualizeServices } from './types';
import {
  VisualizeEditor,
  VisualizeListing,
  VisualizeNoMatch,
  VisualizeByValueEditor,
} from './components';
import { VisualizeConstants } from '../../common/constants';

export interface VisualizeAppProps {
  onAppLeave: AppMountParameters['onAppLeave'];
}

interface NoDataComponentProps {
  core: CoreStart;
  dataViews: DataViewsContract;
  dataViewEditor: DataViewEditorStart;
  onDataViewCreated: (dataView: unknown) => void;
  noDataPage?: NoDataPagePluginStart;
  share?: SharePluginStart;
}

const NoDataComponent = ({
  core,
  dataViews,
  dataViewEditor,
  onDataViewCreated,
  noDataPage,
  share,
}: NoDataComponentProps) => {
  const analyticsServices = {
    coreStart: core,
    dataViews,
    dataViewEditor,
    noDataPage,
    share,
  };

  const importPromise = import('@kbn/shared-ux-page-analytics-no-data');
  const AnalyticsNoDataPageKibanaProvider = withSuspense(
    React.lazy(() =>
      importPromise.then(({ AnalyticsNoDataPageKibanaProvider: NoDataProvider }) => {
        return { default: NoDataProvider };
      })
    )
  );
  const AnalyticsNoDataPage = withSuspense(
    React.lazy(() =>
      importPromise.then(({ AnalyticsNoDataPage: NoDataPage }) => {
        return { default: NoDataPage };
      })
    )
  );

  return (
    <AnalyticsNoDataPageKibanaProvider {...analyticsServices}>
      <AnalyticsNoDataPage onDataViewCreated={onDataViewCreated} />
    </AnalyticsNoDataPageKibanaProvider>
  );
};

export const VisualizeApp = ({ onAppLeave }: VisualizeAppProps) => {
  const {
    services: {
      data: { query, dataViews },
      core,
      kbnUrlStateStorage,
      dataViewEditor,
      noDataPage,
      share,
    },
  } = useKibana<VisualizeServices>();
  const { pathname } = useLocation();
  const [showNoDataPage, setShowNoDataPage] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const onDataViewCreated = useCallback((dataView: unknown) => {
    if (dataView) {
      setShowNoDataPage(false);
    }
  }, []);

  useEffect(() => {
    // syncs `_g` portion of url with query services
    const { stop } = syncGlobalQueryStateWithUrl(query, kbnUrlStateStorage);

    return () => stop();

    // this effect should re-run when pathname is changed to preserve querystring part,
    // so the global state is always preserved
  }, [query, kbnUrlStateStorage, pathname]);

  useEffect(() => {
    const checkESOrDataViewExist = async () => {
      // check if there is any data view or data source
      const hasUserDataView = await dataViews.hasData.hasUserDataView().catch(() => false);
      if (hasUserDataView) {
        // Adding this check as TSVB asks for the default dataview on initialization
        const defaultDataView = await dataViews.defaultDataViewExists();
        if (!defaultDataView) {
          setShowNoDataPage(true);
        }
        setIsLoading(false);
        return;
      }

      setShowNoDataPage(true);
      setIsLoading(false);
    };

    // call the function
    checkESOrDataViewExist();
  }, [dataViews]);

  if (isLoading) {
    return (
      <div className="visAppLoadingWrapper">
        <EuiLoadingSpinner size="xl" />
      </div>
    );
  }

  // Visualize app should return the noData component if there is no data view or data source
  if (showNoDataPage) {
    return (
      <NoDataComponent
        core={core}
        dataViewEditor={dataViewEditor}
        dataViews={dataViews}
        onDataViewCreated={onDataViewCreated}
        noDataPage={noDataPage}
        share={share}
      />
    );
  }

  return (
    <Routes>
      <Route exact path={`${VisualizeConstants.EDIT_BY_VALUE_PATH}`}>
        <VisualizeByValueEditor onAppLeave={onAppLeave} />
      </Route>
      <Route path={[VisualizeConstants.CREATE_PATH, `${VisualizeConstants.EDIT_PATH}/:id`]}>
        <VisualizeEditor onAppLeave={onAppLeave} />
      </Route>
      <Route
        exact
        path={[
          VisualizeConstants.LANDING_PAGE_PATH,
          VisualizeConstants.WIZARD_STEP_1_PAGE_PATH,
          VisualizeConstants.LANDING_PAGE_PATH_WITH_TAB,
        ]}
      >
        <VisualizeListing />
      </Route>
      <VisualizeNoMatch />
    </Routes>
  );
};
