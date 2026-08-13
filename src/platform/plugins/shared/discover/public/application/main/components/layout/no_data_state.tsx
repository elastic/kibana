/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, useCallback } from 'react';
import { css } from '@emotion/react';
import { METRIC_TYPE } from '@kbn/analytics';
import { withSuspense } from '@kbn/shared-ux-utility';
import { ENABLE_ESQL, getESQLAdHocDataview, getIndexForESQLQuery } from '@kbn/esql-utils';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useHasESData } from '../../hooks/use_has_es_data';
import {
  internalStateActions,
  useCurrentTabAction,
  useInternalStateDispatch,
} from '../../state_management/redux';
import { INTEGRATIONS_BROWSE_PATH } from '../../../../constants';

const importNoDataViews = () => import('@kbn/shared-ux-prompt-no-data-views');
const NoDataViewsPromptKibanaProvider = withSuspense(
  lazy(async () => ({ default: (await importNoDataViews()).NoDataViewsPromptKibanaProvider }))
);
const NoDataViewsPrompt = withSuspense(
  lazy(async () => ({ default: (await importNoDataViews()).NoDataViewsPrompt }))
);

/**
 * Shown in place of the document table when the tab has no data view, offering to create
 * one or to switch to ES|QL, and to add data when the cluster is still empty
 */
export const NoDataState = ({
  onDataViewCreated,
}: {
  onDataViewCreated: (dataView: DataView) => void;
}) => {
  const services = useDiscoverServices();
  const { core, dataViews, docLinks, http, share, dataViewEditor, uiSettings, trackUiMetric } =
    services;
  const dispatch = useInternalStateDispatch();
  const transitionFromDataViewToESQL = useCurrentTabAction(
    internalStateActions.transitionFromDataViewToESQL
  );
  const canAddData = useCanAddData();

  const onTryESQL = useCallback(async () => {
    // An ad hoc data view is only needed to derive the initial ES|QL query,
    // the same way the Discover ES|QL locator does it
    const indexName = (await getIndexForESQLQuery({ http })) ?? '*';
    const dataView = await getESQLAdHocDataview({
      dataViewsService: dataViews,
      query: `FROM ${indexName}`,
      http,
    });

    trackUiMetric?.(METRIC_TYPE.CLICK, 'esql:try_btn_clicked');
    dispatch(transitionFromDataViewToESQL({ dataView }));
  }, [dataViews, dispatch, http, trackUiMetric, transitionFromDataViewToESQL]);

  return (
    <div css={styles.container}>
      <NoDataViewsPromptKibanaProvider
        coreStart={core}
        dataViewEditor={dataViewEditor}
        share={share}
      >
        <NoDataViewsPrompt
          onDataViewCreated={(dataView) => onDataViewCreated(dataView as DataView)}
          allowAdHocDataView
          onTryESQL={uiSettings.get(ENABLE_ESQL) ? onTryESQL : undefined}
          addDataHref={
            canAddData ? core.http.basePath.prepend(INTEGRATIONS_BROWSE_PATH) : undefined
          }
          addDataDocLink={docLinks.links.kibana.guide}
          // Creating a data view is already offered by the data view picker of the search bar
          showCreateDataView={false}
        />
      </NoDataViewsPromptKibanaProvider>
    </div>
  );
};

/**
 * Adding data is only worth offering as long as the cluster doesn't contain any data yet
 * and the current user is allowed to browse integrations
 */
const useCanAddData = () => {
  const { core } = useDiscoverServices();
  const hasESData = useHasESData();

  return hasESData === false && Boolean(core.application.capabilities.navLinks.integrations);
};

const styles = {
  container: css({
    // Centers the prompt within the available space
    margin: 'auto',
  }),
};
