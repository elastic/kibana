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
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSuperDatePicker,
  OnTimeChangeProps,
} from '@elastic/eui';
import { CONTROL_GROUP_TYPE } from '@kbn/controls-plugin/common';
import { CoreStart } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { ReactEmbeddableRenderer, ViewMode } from '@kbn/embeddable-plugin/public';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { combineCompatibleChildrenApis, PresentationContainer } from '@kbn/presentation-containers';
import {
  apiPublishesDataLoading,
  HasUniqueId,
  PublishesDataLoading,
  PublishesUnifiedSearch,
  PublishesViewMode,
  PublishingSubject,
  useBatchedPublishingSubjects,
  useStateFromPublishingSubject,
  ViewMode as ViewModeType,
} from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React, { useEffect, useMemo, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import useMount from 'react-use/lib/useMount';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { ControlGroupApi } from '../react_controls/control_group/types';
import { SEARCH_CONTROL_TYPE } from '../react_controls/data_controls/search_control/types';
import { TIMESLIDER_CONTROL_TYPE } from '../react_controls/timeslider_control/types';
import { RANGE_SLIDER_CONTROL_TYPE } from '../react_controls/data_controls/range_slider/types';

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

const searchControlId = 'searchControl1';
const rangeSliderControlId = 'rangeSliderControl1';
const timesliderControlId = 'timesliderControl1';
const controlGroupPanels = {
  [searchControlId]: {
    type: SEARCH_CONTROL_TYPE,
    order: 0,
    grow: true,
    width: 'medium',
    explicitInput: {
      id: searchControlId,
      fieldName: 'message',
      title: 'Message',
      grow: true,
      width: 'medium',
      searchString: 'this',
      enhancements: {},
    },
  },
  [rangeSliderControlId]: {
    type: RANGE_SLIDER_CONTROL_TYPE,
    order: 0,
    grow: true,
    width: 'medium',
    explicitInput: {
      id: rangeSliderControlId,
      fieldName: 'bytes',
      title: 'Bytes',
      grow: true,
      width: 'medium',
      enhancements: {},
    },
  },
  [timesliderControlId]: {
    type: TIMESLIDER_CONTROL_TYPE,
    order: 0,
    grow: true,
    width: 'medium',
    explicitInput: {
      id: timesliderControlId,
      title: 'Time slider',
      enhancements: {},
    },
  },
};

/**
 * I am mocking the dashboard API so that the data table embeddble responds to changes to the
 * data view publishing subject from the control group
 */
type MockedDashboardApi = PresentationContainer &
  PublishesDataLoading &
  PublishesViewMode &
  PublishesUnifiedSearch & {
    setViewMode: (newViewMode: ViewMode) => void;
    setChild: (child: HasUniqueId) => void;
    unifiedSearchFilters$: PublishingSubject<Filter[] | undefined>;
  };

export const ReactControlExample = ({
  core,
  dataViews: dataViewsService,
}: {
  core: CoreStart;
  dataViews: DataViewsPublicPluginStart;
}) => {
  const dataLoading$ = useMemo(() => {
    return new BehaviorSubject<boolean | undefined>(false);
  }, []);
  const controlGroupFilters$ = useMemo(() => {
    return new BehaviorSubject<Filter[] | undefined>(undefined);
  }, []);
  const filters$ = useMemo(() => {
    return new BehaviorSubject<Filter[] | undefined>(undefined);
  }, []);
  const unifiedSearchFilters$ = useMemo(() => {
    return new BehaviorSubject<Filter[] | undefined>(undefined);
  }, []);
  const timeRange$ = useMemo(() => {
    return new BehaviorSubject<TimeRange | undefined>({
      from: 'now-24h',
      to: 'now',
    });
  }, []);
  const timeslice$ = useMemo(() => {
    return new BehaviorSubject<[number, number] | undefined>(undefined);
  }, []);
  const [dataLoading, timeRange] = useBatchedPublishingSubjects(dataLoading$, timeRange$);

  const [dashboardApi, setDashboardApi] = useState<MockedDashboardApi | undefined>(undefined);
  const [controlGroupApi, setControlGroupApi] = useState<ControlGroupApi | undefined>(undefined);
  const viewModeSelected = useStateFromPublishingSubject(dashboardApi?.viewMode);

  useMount(() => {
    const viewMode = new BehaviorSubject<ViewModeType>(ViewMode.EDIT as ViewModeType);
    const query$ = new BehaviorSubject<Query | AggregateQuery | undefined>(undefined);
    const children$ = new BehaviorSubject<{ [key: string]: unknown }>({});

    setDashboardApi({
      dataLoading: dataLoading$,
      viewMode,
      unifiedSearchFilters$,
      filters$,
      query$,
      timeRange$,
      timeslice$,
      children$,
      setViewMode: (newViewMode) => viewMode.next(newViewMode),
      setChild: (child) => children$.next({ ...children$.getValue(), [child.uuid]: child }),
      removePanel: () => {},
      replacePanel: () => {
        return Promise.resolve('');
      },
      getPanelCount: () => {
        return 2;
      },
      addNewPanel: () => {
        return Promise.resolve(undefined);
      },
    });
  });

  useEffect(() => {
    const subscription = combineCompatibleChildrenApis<PublishesDataLoading, boolean | undefined>(
      dashboardApi,
      'dataLoading',
      apiPublishesDataLoading,
      undefined,
      // flatten method
      (values) => {
        return values.some((isLoading) => isLoading);
      }
    ).subscribe((isAtLeastOneChildLoading) => {
      dataLoading$.next(isAtLeastOneChildLoading);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [dashboardApi, dataLoading$]);

  // TODO: Maybe remove `useAsync` - see https://github.com/elastic/kibana/pull/182842#discussion_r1624909709
  const {
    loading,
    value: dataViews,
    error,
  } = useAsync(async () => {
    return await dataViewsService.find('kibana_sample_data_logs');
  }, []);

  useEffect(() => {
    if (!controlGroupApi) return;

    const subscription = controlGroupApi.filters$.subscribe((controlGroupFilters) => {
      controlGroupFilters$.next(controlGroupFilters);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [controlGroupFilters$, controlGroupApi]);

  useEffect(() => {
    if (!controlGroupApi) return;

    const subscription = controlGroupApi.timeslice$.subscribe((timeslice) => {
      timeslice$.next(timeslice);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [controlGroupApi, timeslice$]);

  useEffect(() => {
    const subscription = combineLatest([controlGroupFilters$, unifiedSearchFilters$]).subscribe(
      ([controlGroupFilters, unifiedSearchFilters]) => {
        filters$.next([...(controlGroupFilters ?? []), ...(unifiedSearchFilters ?? [])]);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [controlGroupFilters$, filters$, unifiedSearchFilters$]);

  if (error || (!dataViews?.[0]?.id && !loading))
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={<h2>There was an error!</h2>}
        body={<p>{error ? error.message : 'Please add at least one data view.'}</p>}
      />
    );

  return loading ? (
    <EuiLoadingSpinner />
  ) : (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={() => {
              controlGroupApi?.onEdit();
            }}
            size="s"
          >
            Control group settings
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={() => {
              core.overlays.openModal(
                toMountPoint(
                  <EuiCodeBlock language="json">
                    {JSON.stringify(controlGroupApi?.serializeState(), null, 2)}
                  </EuiCodeBlock>,
                  {
                    theme: core.theme,
                    i18n: core.i18n,
                  }
                )
              );
            }}
            size="s"
          >
            Serialize control group
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend="Change the view mode"
            options={toggleViewButtons}
            idSelected={`viewModeToggle_${viewModeSelected}`}
            onChange={(_, value) => {
              dashboardApi?.setViewMode(value);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiSuperDatePicker
        isLoading={dataLoading}
        start={timeRange?.from}
        end={timeRange?.to}
        onTimeChange={({ start, end }: OnTimeChangeProps) => {
          timeRange$.next({
            from: start,
            to: end,
          });
        }}
      />
      <EuiSpacer size="m" />
      <ReactEmbeddableRenderer
        onApiAvailable={(api) => {
          dashboardApi?.setChild(api);
          setControlGroupApi(api as ControlGroupApi);
        }}
        hidePanelChrome={true}
        type={CONTROL_GROUP_TYPE}
        getParentApi={() => ({
          ...dashboardApi,
          getSerializedStateForChild: () => ({
            rawState: {
              controlStyle: 'oneLine',
              chainingSystem: 'HIERARCHICAL',
              showApplySelections: false,
              panelsJSON: JSON.stringify(controlGroupPanels),
              ignoreParentSettingsJSON:
                '{"ignoreFilters":false,"ignoreQuery":false,"ignoreTimerange":false,"ignoreValidations":false}',
            } as object,
            references: [
              {
                name: `controlGroup_${searchControlId}:${SEARCH_CONTROL_TYPE}DataView`,
                type: 'index-pattern',
                id: dataViews?.[0].id!,
              },
              {
                name: `controlGroup_${rangeSliderControlId}:${RANGE_SLIDER_CONTROL_TYPE}DataView`,
                type: 'index-pattern',
                id: dataViews?.[0].id!,
              },
            ],
          }),
        })}
        key={`control_group`}
      />
      <EuiSpacer size="l" />
      <div style={{ height: '400px' }}>
        <ReactEmbeddableRenderer
          type={'data_table'}
          getParentApi={() => ({
            ...dashboardApi,
            getSerializedStateForChild: () => ({
              rawState: {},
              references: [],
            }),
          })}
          hidePanelChrome={false}
          onApiAvailable={(api) => {
            dashboardApi?.setChild(api);
          }}
        />
      </div>
    </>
  );
};
