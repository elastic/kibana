/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, useCallback, useEffect, useState } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { METRIC_TYPE } from '@kbn/analytics';
import { withSuspense } from '@kbn/shared-ux-utility';
import { ENABLE_ESQL, getESQLAdHocDataview, getIndexForESQLQuery } from '@kbn/esql-utils';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import {
  internalStateActions,
  useCurrentTabAction,
  useInternalStateDispatch,
} from '../../state_management/redux';

const importNoDataViews = () => import('@kbn/shared-ux-prompt-no-data-views');
const NoDataViewsPromptKibanaProvider = withSuspense(
  lazy(async () => ({ default: (await importNoDataViews()).NoDataViewsPromptKibanaProvider }))
);
const NoDataViewsPrompt = withSuspense(
  lazy(async () => ({ default: (await importNoDataViews()).NoDataViewsPrompt }))
);

const INTEGRATIONS_PATH = '/app/integrations/browse';

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
  const { core, dataViews, http, share, dataViewEditor, uiSettings, trackUiMetric } = services;
  const dispatch = useInternalStateDispatch();
  const transitionFromDataViewToESQL = useCurrentTabAction(
    internalStateActions.transitionFromDataViewToESQL
  );

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
      <AddDataCallOut />
      <NoDataViewsPromptKibanaProvider
        coreStart={core}
        dataViewEditor={dataViewEditor}
        share={share}
      >
        <NoDataViewsPrompt
          onDataViewCreated={(dataView) => onDataViewCreated(dataView as DataView)}
          allowAdHocDataView
          onTryESQL={uiSettings.get(ENABLE_ESQL) ? onTryESQL : undefined}
        />
      </NoDataViewsPromptKibanaProvider>
    </div>
  );
};

/**
 * Points to the integrations app as long as the cluster doesn't contain any data yet
 */
const AddDataCallOut = () => {
  const { core, dataViews } = useDiscoverServices();
  const [hasESData, setHasESData] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    dataViews.hasData
      .hasESData()
      // Don't nag about missing data if we can't tell
      .catch(() => true)
      .then((nextHasESData) => {
        if (mounted) {
          setHasESData(nextHasESData);
        }
      });

    return () => {
      mounted = false;
    };
  }, [dataViews]);

  if (hasESData !== false) {
    return null;
  }

  const canAccessIntegrations = Boolean(core.application.capabilities.navLinks.integrations);

  return (
    <>
      <EuiCallOut
        data-test-subj="discoverNoDataCallOut"
        size="s"
        color="primary"
        iconType="info"
        title={i18n.translate('discover.noDataState.addDataCallOutTitle', {
          defaultMessage: 'No data available',
        })}
        text={i18n.translate('discover.noDataState.addDataCallOutDescription', {
          defaultMessage: 'Add data to Elasticsearch to start exploring it here.',
        })}
        actionProps={
          canAccessIntegrations
            ? {
                secondary: {
                  href: core.http.basePath.prepend(INTEGRATIONS_PATH),
                  'data-test-subj': 'discoverNoDataBrowseIntegrations',
                  children: (
                    <FormattedMessage
                      id="discover.noDataState.browseIntegrationsButtonLabel"
                      defaultMessage="Browse integrations"
                    />
                  ),
                },
              }
            : undefined
        }
      />
      <EuiSpacer size="l" />
    </>
  );
};

const styles = {
  container: css({
    // Keeps the prompt centered within the page while the call out stays above it
    margin: 'auto',
  }),
};
