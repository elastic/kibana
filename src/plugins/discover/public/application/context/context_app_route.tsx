/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ContextApp } from './context_app';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { getScopedHistory } from '../../kibana_services';
import { useDataView } from '../../hooks/use_data_view';
import type { HistoryLocationState } from '../../build_services';

export interface ContextUrlParams {
  dataViewId: string;
  id: string;
}

export function ContextAppRoute() {
  const locationState = useMemo(
    () => getScopedHistory().location.state as HistoryLocationState | undefined,
    []
  );

  const { dataViewId: encodedDataViewId, id } = useParams<ContextUrlParams>();
  const dataViewId = decodeURIComponent(encodedDataViewId);
  const anchorId = decodeURIComponent(id);

  const { dataView, error } = useDataView({ dataViewId });

  if (error) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        iconColor="danger"
        title={
          <FormattedMessage
            id="discover.contextViewRoute.errorTitle"
            defaultMessage="An error occurred"
          />
        }
        body={
          <FormattedMessage
            id="discover.contextViewRoute.errorMessage"
            defaultMessage="No matching data view for id {dataViewId}"
            values={{ dataViewId }}
          />
        }
      />
    );
  }

  if (!dataView) {
    return <LoadingIndicator />;
  }

  return <ContextApp anchorId={anchorId} dataView={dataView} referrer={locationState?.referrer} />;
}
