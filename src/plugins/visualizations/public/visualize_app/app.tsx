/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './app.scss';
import React, { useEffect, useCallback, useState } from 'react';
import { Route, Switch, useLocation } from 'react-router-dom';
import { EuiLoadingSpinner } from '@elastic/eui';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import { syncGlobalQueryStateWithUrl } from '@kbn/data-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  AnalyticsNoDataPageKibanaProvider,
  AnalyticsNoDataPage,
} from '@kbn/shared-ux-page-analytics-no-data';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { of } from 'rxjs';
import { CustomBrandingStart } from '@kbn/core-custom-branding-browser';
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
  customBranding: CustomBrandingStart;
}

const NoDataComponent = ({
  core,
  dataViews,
  dataViewEditor,
  onDataViewCreated,
  customBranding,
}: NoDataComponentProps) => {
  const hasCustomBranding = customBranding.hasCustomBranding$.pipe(() => {
    return of(true);
  })
    ? true
    : false;

  const analyticsServices = {
    coreStart: {
      ...core,
      customBranding: {
        hasCustomBranding,
      },
    },
    dataViews,
    dataViewEditor,
    customBranding: {
      hasCustomBranding,
    },
  };
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
      customBranding,
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
        const defaultDataView = await dataViews.getDefaultDataView();
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
        customBranding={customBranding}
      />
    );
  }

  return (
    <Switch>
      <Route exact path={`${VisualizeConstants.EDIT_BY_VALUE_PATH}`}>
        <VisualizeByValueEditor onAppLeave={onAppLeave} />
      </Route>
      <Route path={[VisualizeConstants.CREATE_PATH, `${VisualizeConstants.EDIT_PATH}/:id`]}>
        <VisualizeEditor onAppLeave={onAppLeave} />
      </Route>
      <Route
        exact
        path={[VisualizeConstants.LANDING_PAGE_PATH, VisualizeConstants.WIZARD_STEP_1_PAGE_PATH]}
      >
        <VisualizeListing />
      </Route>
      <VisualizeNoMatch />
    </Switch>
  );
};
