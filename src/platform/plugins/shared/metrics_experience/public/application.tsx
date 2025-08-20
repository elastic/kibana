/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import MetricsExperienceGrid from './components';
import type { MetricsExperiencePluginStartDependencies, MetricsExperienceService } from './types';
import { useKibana } from './hooks';

interface ApplicationProps {
  appMountParameters: AppMountParameters;
  coreStart: CoreStart;
  pluginsStart: MetricsExperiencePluginStartDependencies;
  service: MetricsExperienceService;
}

export const useMetricsDataView = () => {
  const {
    services: { dataViews },
  } = useKibana();

  const [state, refetch] = useAsyncFn(async () => {
    const dataViewReference = await dataViews.create(
      {
        id: 'metrics-*',
        name: 'Dummy metrics adhoc data view',
        title: 'Dummy metrics adhoc data view',
        timeFieldName: '@timestamp',
      },
      false,
      false
    );

    return {
      indices: 'metrics-*',
      timeFieldName: '@timestamp',
      fields: dataViewReference.fields,
      dataViewReference,
    };
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const { value: metricsView, error, loading } = state;

  return {
    metricsView,
    loading,
    error,
    refetch,
  };
};

export const Application = ({ coreStart, service, pluginsStart }: ApplicationProps) => {
  const { metricsView } = useMetricsDataView();
  return (
    <KibanaContextProvider services={{ ...coreStart, ...pluginsStart }}>
      <MetricsExperienceGrid
        dataView={metricsView?.dataViewReference}
        getTimeRange={() => ({ from: 'now-1h', to: 'now' })}
        renderToggleActions={() => <></>}
      />
    </KibanaContextProvider>
  );
};
