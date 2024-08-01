/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { BehaviorSubject, combineLatest } from 'rxjs';

import {
  EuiButton,
  EuiButtonGroup,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSuperDatePicker,
  OnTimeChangeProps,
} from '@elastic/eui';
import {
  CONTROL_GROUP_TYPE,
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_WIDTH,
} from '@kbn/controls-plugin/common';
import { CoreStart } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { ReactEmbeddableRenderer, ViewMode } from '@kbn/embeddable-plugin/public';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { combineCompatibleChildrenApis } from '@kbn/presentation-containers';
import {
  apiPublishesDataLoading,
  HasUniqueId,
  PublishesDataLoading,
  useBatchedPublishingSubjects,
  ViewMode as ViewModeType,
} from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { ControlGroupApi } from '../react_controls/control_group/types';
import { RANGE_SLIDER_CONTROL_TYPE } from '../react_controls/data_controls/range_slider/types';
import { SEARCH_CONTROL_TYPE } from '../react_controls/data_controls/search_control/types';
import { TIMESLIDER_CONTROL_TYPE } from '../react_controls/timeslider_control/types';
import { openDataControlEditor } from '../react_controls/data_controls/open_data_control_editor';

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
    order: 2,
    grow: true,
    width: 'medium',
    explicitInput: {
      id: searchControlId,
      fieldName: 'message',
      title: 'Message',
      grow: true,
      width: 'medium',
      enhancements: {},
    },
  },
  [rangeSliderControlId]: {
    type: RANGE_SLIDER_CONTROL_TYPE,
    order: 1,
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

const WEB_LOGS_DATA_VIEW_ID = '90943e30-9a47-11e8-b64d-95841ca0b247';

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
  const viewMode$ = useMemo(() => {
    return new BehaviorSubject<ViewModeType>(ViewMode.EDIT as ViewModeType);
  }, []);
  const [dataLoading, timeRange, viewMode] = useBatchedPublishingSubjects(
    dataLoading$,
    timeRange$,
    viewMode$
  );

  const [controlGroupApi, setControlGroupApi] = useState<ControlGroupApi | undefined>(undefined);
  const [isControlGroupInitialized, setIsControlGroupInitialized] = useState(false);
  const [dataViewNotFound, setDataViewNotFound] = useState(false);

  const dashboardApi = useMemo(() => {
    const query$ = new BehaviorSubject<Query | AggregateQuery | undefined>(undefined);
    const children$ = new BehaviorSubject<{ [key: string]: unknown }>({});

    return {
      dataLoading: dataLoading$,
      unifiedSearchFilters$,
      viewMode: viewMode$,
      filters$,
      query$,
      timeRange$,
      timeslice$,
      children$,
      publishFilters: (newFilters: Filter[] | undefined) => filters$.next(newFilters),
      setChild: (child: HasUniqueId) =>
        children$.next({ ...children$.getValue(), [child.uuid]: child }),
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
      lastUsedDataViewId: new BehaviorSubject<string>(WEB_LOGS_DATA_VIEW_ID),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => {
    let ignore = false;
    dataViewsService.get(WEB_LOGS_DATA_VIEW_ID).catch(() => {
      if (!ignore) {
        setDataViewNotFound(true);
      }
    });

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!controlGroupApi) {
      return;
    }
    let ignore = false;
    controlGroupApi.untilInitialized().then(() => {
      if (!ignore) {
        setIsControlGroupInitialized(true);
      }
    });

    return () => {
      ignore = true;
    };
  }, [controlGroupApi]);

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

  return (
    <>
      {dataViewNotFound && (
        <>
          <EuiCallOut color="warning" iconType="warning">
            <p>{`Install "Sample web logs" to run example`}</p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
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
        {controlGroupApi && (
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={() => {
                openDataControlEditor({
                  initialState: {
                    grow: DEFAULT_CONTROL_GROW,
                    width: DEFAULT_CONTROL_WIDTH,
                    dataViewId: dashboardApi.lastUsedDataViewId.getValue(),
                  },
                  onSave: ({ type: controlType, state: initialState }) => {
                    controlGroupApi.addNewPanel({
                      panelType: controlType,
                      initialState,
                    });
                  },
                  controlGroupApi,
                  services: {
                    core,
                    dataViews: dataViewsService,
                  },
                });
              }}
              size="s"
            >
              Add new data control
            </EuiButton>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend="Change the view mode"
            options={toggleViewButtons}
            idSelected={`viewModeToggle_${viewMode}`}
            onChange={(_, value) => {
              viewMode$.next(value);
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
                id: WEB_LOGS_DATA_VIEW_ID,
              },
              {
                name: `controlGroup_${rangeSliderControlId}:${RANGE_SLIDER_CONTROL_TYPE}DataView`,
                type: 'index-pattern',
                id: WEB_LOGS_DATA_VIEW_ID,
              },
            ],
          }),
        })}
        key={`control_group`}
      />
      <EuiSpacer size="l" />
      {isControlGroupInitialized && (
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
      )}
    </>
  );
};
