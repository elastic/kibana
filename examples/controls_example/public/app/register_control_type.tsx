/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { OverlayStart } from '@kbn/core-overlays-browser';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import React from 'react';
import useAsync from 'react-use/lib/useAsync';

import { ControlRenderer } from '../controls/control_renderer';
import { SearchControlState, SEARCH_CONTROL_TYPE } from '../controls/search_control/types';
import { DataControlApi } from '../controls/types';

export const RegisterControlType = ({
  overlays,
  dataViews: dataViewsService,
}: {
  overlays: OverlayStart;
  dataViews: DataViewsPublicPluginStart;
}) => {
  const {
    loading,
    value: dataViews,
    error,
  } = useAsync(async () => {
    return await dataViewsService.find('kibana_sample_data_logs');
  }, []);

  if (loading || !dataViews || !dataViews[0].id) return <EuiLoadingSpinner />;

  return (
    <ControlRenderer<SearchControlState, DataControlApi>
      services={{ overlays, dataViews: dataViewsService }}
      type={SEARCH_CONTROL_TYPE}
      state={{
        dataViewId: dataViews[0].id,
        fieldName: 'test',
        searchString: 'test',
      }}
    />
  );
};
