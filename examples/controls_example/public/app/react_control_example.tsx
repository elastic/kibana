/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { CONTROL_GROUP_TYPE } from '@kbn/controls-plugin/common';
import { OverlayStart } from '@kbn/core-overlays-browser';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { ReactEmbeddableRenderer, ViewMode } from '@kbn/embeddable-plugin/public';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { PresentationContainer } from '@kbn/presentation-containers';
import {
  PublishesUnifiedSearch,
  PublishesViewMode,
  useStateFromPublishingSubject,
  ViewMode as ViewModeType,
} from '@kbn/presentation-publishing';
import React, { useEffect, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { BehaviorSubject } from 'rxjs';
import { ControlGroupApi } from '../react_controls/control_group/types';

const toggleViewButtons = [
  {
    id: `viewModeToggle_edit`,
    value: ViewMode.EDIT,
    label: 'Edit mode',
  },
  {
    id: `viewModeToggle_view`,
    value: ViewMode.VIEW,
    label: 'View mode',
  },
];

/**
 * I am mocking the dashboard API so that the data table embeddble responds to changes to the
 * data view publishing subject from the control group
 */
type MockedDashboardApi = PresentationContainer & PublishesViewMode & PublishesUnifiedSearch;

const viewMode = new BehaviorSubject<ViewModeType>(ViewMode.EDIT as ViewModeType);
const filters$ = new BehaviorSubject<Filter[] | undefined>([]);
const query$ = new BehaviorSubject<Query | AggregateQuery | undefined>(undefined);
const timeRange$ = new BehaviorSubject<TimeRange | undefined>(undefined);
const children$ = new BehaviorSubject<{ [key: string]: unknown }>({});
const fakeParentApi: MockedDashboardApi = {
  viewMode,
  filters$,
  query$,
  timeRange$,
  children$,
  removePanel: () => {},
  replacePanel: () => {
    return Promise.resolve('');
  },
  addNewPanel: () => {
    return Promise.resolve(undefined);
  },
};

export const ReactControlExample = ({
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

  const [controlGroupApi, setControlGroupApi] = useState<ControlGroupApi | undefined>(undefined);
  const viewModeSelected = useStateFromPublishingSubject(viewMode);

  useEffect(() => {
    if (!controlGroupApi) return;

    const subscription = controlGroupApi.filters$.subscribe((controlGroupFilters) => {
      filters$.next(controlGroupFilters);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [controlGroupApi]);

  if (loading || !dataViews || !dataViews[0].id) return <EuiLoadingSpinner />;

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend="This is a basic group"
            options={toggleViewButtons}
            idSelected={`viewModeToggle_${viewModeSelected}`}
            onChange={(_, value) => {
              viewMode.next(value);
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={() => {
              console.log(controlGroupApi?.serializeState());
            }}
            size="s"
          >
            Serialize control group
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <ReactEmbeddableRenderer
        onApiAvailable={(api) => {
          children$.next({ ...children$.getValue(), [api.uuid]: api });
          setControlGroupApi(api as ControlGroupApi);
        }}
        hidePanelChrome={true}
        type={CONTROL_GROUP_TYPE}
        parentApi={fakeParentApi} // should be the dashboard
        key={`control_group`}
        state={{
          rawState: {
            controlStyle: 'oneLine',
            chainingSystem: 'HIERARCHICAL',
            showApplySelections: false,
            panelsJSON:
              '{"a957862f-beae-4f0c-8a3a-a6ea4c235651":{"type":"searchControl","order":0,"grow":true,"width":"medium","explicitInput":{"id":"a957862f-beae-4f0c-8a3a-a6ea4c235651","fieldName":"message","title":"Message","grow":true,"width":"medium","searchString": "this","enhancements":{}}}}',
            ignoreParentSettingsJSON:
              '{"ignoreFilters":false,"ignoreQuery":false,"ignoreTimerange":false,"ignoreValidations":false}',
          } as object,
          references: [
            {
              name: 'controlGroup_a957862f-beae-4f0c-8a3a-a6ea4c235651:searchControlDataView',
              type: 'index-pattern',
              id: dataViews[0].id,
            },
          ],
        }}
      />
      <EuiSpacer size="l" />
      <ReactEmbeddableRenderer
        type={'data_table'}
        state={{
          rawState: {
            timeRange: { from: 'now-60d/d', to: 'now+60d/d' },
          },
          references: [],
        }}
        parentApi={fakeParentApi}
        hidePanelChrome={false}
        onApiAvailable={(api) => {
          children$.next({ ...children$.getValue(), [api.uuid]: api });
        }}
      />
    </>
  );
};
