/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import useAsync from 'react-use/lib/useAsync';
import { v4 as uuidv4 } from 'uuid';
import {
  getESQLAdHocDataview,
  getESQLQueryColumns,
  getIndexForESQLQuery,
  getInitialESQLQuery,
} from '@kbn/esql-utils';
import { withSuspense } from '@kbn/shared-ux-utility';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { getLensAttributesFromSuggestion } from '@kbn/visualization-utils';

import { DASHBOARD_APP_ID } from '../../dashboard_constants';
import {
  coreServices,
  dataService,
  dataViewEditorService,
  embeddableService,
  noDataPageService,
  shareService,
  lensService,
} from '../../services/kibana_services';
import { getDashboardBackupService } from '../../services/dashboard_backup_service';
import { getDashboardContentManagementService } from '../../services/dashboard_content_management_service';

function generateId() {
  return uuidv4();
}

export const DashboardAppNoDataPage = ({ showPage }: { showPage: () => void }) => {
  const analyticsServices = {
    coreStart: coreServices,
    dataViews: dataService.dataViews,
    dataViewEditor: dataViewEditorService,
    noDataPage: noDataPageService,
    share: shareService,
  };
  const [abortController, setAbortController] = useState(new AbortController());
  const importPromise = import('@kbn/shared-ux-page-analytics-no-data');
  const AnalyticsNoDataPageKibanaProvider = withSuspense(
    React.lazy(() =>
      importPromise.then(({ AnalyticsNoDataPageKibanaProvider: NoDataProvider }) => {
        return { default: NoDataProvider };
      })
    )
  );

  const lensHelpersAsync = useAsync(() => {
    return lensService?.stateHelperApi() ?? Promise.resolve(null);
  }, [lensService]);

  useEffect(() => {
    return () => {
      abortController?.abort();
    };
  }, [abortController]);

  const onTryESQL = useCallback(async () => {
    abortController?.abort();
    if (lensHelpersAsync.value) {
      const abc = new AbortController();
      const { dataViews } = dataService;
      const indexName = (await getIndexForESQLQuery({ dataViews })) ?? '*';
      const dataView = await getESQLAdHocDataview(`from ${indexName}`, dataViews);
      const esqlQuery = getInitialESQLQuery(dataView);

      try {
        const columns = await getESQLQueryColumns({
          esqlQuery,
          search: dataService.search.search,
          signal: abc.signal,
          timeRange: dataService.query.timefilter.timefilter.getAbsoluteTime(),
        });

        // lens suggestions api context
        const context = {
          dataViewSpec: dataView?.toSpec(false),
          fieldName: '',
          textBasedColumns: columns,
          query: { esql: esqlQuery },
        };

        setAbortController(abc);

        const chartSuggestions = lensHelpersAsync.value.suggestions(context, dataView);
        if (chartSuggestions?.length) {
          const [suggestion] = chartSuggestions;

          const attrs = getLensAttributesFromSuggestion({
            filters: [],
            query: {
              esql: esqlQuery,
            },
            suggestion,
            dataView,
          }) as TypedLensByValueInput['attributes'];

          const lensEmbeddableInput = {
            attributes: attrs,
            id: generateId(),
          };

          await embeddableService.getStateTransfer().navigateToWithEmbeddablePackage('dashboards', {
            state: {
              type: 'lens',
              input: lensEmbeddableInput,
            },
            path: '#/create',
          });
          showPage();
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          coreServices.notifications.toasts.addWarning(
            i18n.translate('dashboard.noDataviews.esqlRequestWarningMessage', {
              defaultMessage: 'Unable to load columns. {errorMessage}',
              values: { errorMessage: error.message },
            })
          );
        }
      }
    }
  }, [abortController, lensHelpersAsync.value, showPage]);

  const AnalyticsNoDataPage = withSuspense(
    React.lazy(() =>
      importPromise.then(({ AnalyticsNoDataPage: NoDataPage }) => {
        return { default: NoDataPage };
      })
    )
  );

  return (
    <AnalyticsNoDataPageKibanaProvider {...analyticsServices}>
      <AnalyticsNoDataPage onDataViewCreated={showPage} onTryESQL={onTryESQL} />
    </AnalyticsNoDataPageKibanaProvider>
  );
};

export const isDashboardAppInNoDataState = async () => {
  const hasUserDataView = await dataService.dataViews.hasData.hasUserDataView().catch(() => false);

  if (hasUserDataView) return false;

  // consider has data if there is an incoming embeddable
  const hasIncomingEmbeddable = embeddableService
    .getStateTransfer()
    .getIncomingEmbeddablePackage(DASHBOARD_APP_ID, false);
  if (hasIncomingEmbeddable) return false;

  // consider has data if there is unsaved dashboard with edits
  if (getDashboardBackupService().dashboardHasUnsavedEdits()) return false;

  // consider has data if there is at least one dashboard
  const { total } = await getDashboardContentManagementService()
    .findDashboards.search({ search: '', size: 1 })
    .catch(() => ({ total: 0 }));
  if (total > 0) return false;

  return true;
};
