/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { EuiLoadingLogo } from '@elastic/eui';
import { DiscoverServices } from '../../build_services';
import type { Alert } from '../../../../../../x-pack/plugins/alerting/common';
import { AlertTypeParams } from '../../../../../../x-pack/plugins/alerting/common';
import { Filter, SearchSourceFields } from '../../../../data/common';
import { DiscoverAppLocatorParams } from '../../locator';

interface DiscoverThresholdAlertParams extends AlertTypeParams {
  searchSourceFields: SearchSourceFields;
}

const LEGACY_BASE_ALERT_API_PATH = '/api/alerts';

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

export interface NotFoundRouteProps {
  /**
   * Id of an alert
   */
  id: string;
  /**
   * Kibana core services used by discover
   */
  services: DiscoverServices;
}

export function ViewAlertRoute(props: NotFoundRouteProps) {
  const query = useQuery();
  const { services } = props;
  const { core, data, locator } = services;
  const [alert, setAlert] = useState<Alert<DiscoverThresholdAlertParams> | null>(null);

  useEffect(() => {
    if (!alert) {
      core.http
        .get<Alert<DiscoverThresholdAlertParams> | null>(
          `${LEGACY_BASE_ALERT_API_PATH}/alert/${props.id}`
        )
        .then(setAlert);
    }
  }, [alert, core, props]);

  useEffect(() => {
    const createSearchSource = async () => {
      if (alert) {
        // Todo, needs a check if the searchSource is still valid or was edited
        const searchSource = await data.search.searchSource.create(alert.params.searchSourceFields);
        const index = searchSource.getField('index');
        const state: DiscoverAppLocatorParams = {
          query: searchSource.getField('query') || data.query.queryString.getDefaultQuery(),
          indexPatternId: index?.id,
          timeRange: {
            from: query.get('from')!,
            to: query.get('to')!,
          },
        };
        const filter = searchSource.getOwnField('filter');
        if (filter) {
          state.filter = filter as Filter;
        }
        await locator.navigate(state);
      }
    };
    if (alert?.params.searchSourceFields) {
      createSearchSource();
    }
  }, [alert, data.query.queryString, data.search.searchSource, locator, query]);

  return (
    <div>
      <EuiLoadingLogo logo="logoKibana" size="xl" />
    </div>
  );
}
