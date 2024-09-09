/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import { BehaviorSubject, combineLatest, Subject } from 'rxjs';
import useMountedState from 'react-use/lib/useMountedState';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiToolTip,
  OnTimeChangeProps,
} from '@elastic/eui';
import { CONTROL_GROUP_TYPE } from '@kbn/controls-plugin/common';
import { ControlGroupApi } from '@kbn/controls-plugin/public';
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

import {
  clearControlGroupSerializedState,
  getControlGroupSerializedState,
  setControlGroupSerializedState,
  WEB_LOGS_DATA_VIEW_ID,
} from './serialized_control_group_state';
import {
  clearControlGroupRuntimeState,
  getControlGroupRuntimeState,
  setControlGroupRuntimeState,
} from './runtime_control_group_state';

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

export const ReactControlExample = ({
  core,
  dataViews: dataViewsService,
}: {
  core: CoreStart;
  dataViews: DataViewsPublicPluginStart;
}) => {
  const isMounted = useMountedState();
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
  const saveNotification$ = useMemo(() => {
    return new Subject<void>();
  }, []);
  const reload$ = useMemo(() => {
    return new Subject<void>();
  }, []);
  const [dataLoading, timeRange, viewMode] = useBatchedPublishingSubjects(
    dataLoading$,
    timeRange$,
    viewMode$
  );

  const [controlGroupApi, setControlGroupApi] = useState<ControlGroupApi | undefined>(undefined);
  const [isControlGroupInitialized, setIsControlGroupInitialized] = useState(false);
  const [dataViewNotFound, setDataViewNotFound] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

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
      saveNotification$,
      reload$,
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

  const [hasControls, setHasControls] = useState(false);
  useEffect(() => {
    if (!controlGroupApi) {
      return;
    }
    const subscription = controlGroupApi.children$.subscribe((children) => {
      setHasControls(Object.keys(children).length > 0);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [controlGroupApi]);

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

  const [unsavedChanges, setUnsavedChanges] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!controlGroupApi) {
      return;
    }
    const subscription = controlGroupApi.unsavedChanges.subscribe((nextUnsavedChanges) => {
      if (!nextUnsavedChanges) {
        clearControlGroupRuntimeState();
        setUnsavedChanges(undefined);
        return;
      }

      setControlGroupRuntimeState(nextUnsavedChanges);

      // JSON.stringify removes keys where value is `undefined`
      // switch `undefined` to `null` to see when value has been cleared
      const replacer = (key: unknown, value: unknown) =>
        typeof value === 'undefined' ? null : value;
      setUnsavedChanges(JSON.stringify(nextUnsavedChanges, replacer, '  '));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [controlGroupApi]);

  return (
    <>
      {dataViewNotFound && (
        <EuiCallOut color="warning" iconType="warning">
          <p>{`Install "Sample web logs" to run example`}</p>
        </EuiCallOut>
      )}
      {!dataViewNotFound && (
        <EuiCallOut title="This example uses session storage to persist saved state and unsaved changes">
          <EuiButton
            color="accent"
            size="s"
            onClick={() => {
              clearControlGroupSerializedState();
              clearControlGroupRuntimeState();
              window.location.reload();
            }}
          >
            Reset example
          </EuiButton>
        </EuiCallOut>
      )}

      <EuiSpacer size="m" />

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
                controlGroupApi?.openAddDataControlFlyout();
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
        {unsavedChanges !== undefined && viewMode === 'edit' && (
          <>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={<pre>{unsavedChanges}</pre>}>
                <EuiBadge color="warning">Unsaved changes</EuiBadge>
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                isDisabled={!controlGroupApi || isResetting}
                isLoading={isResetting}
                onClick={async () => {
                  if (!controlGroupApi) {
                    return;
                  }
                  setIsResetting(true);
                  await controlGroupApi.asyncResetUnsavedChanges();
                  if (isMounted()) setIsResetting(false);
                }}
              >
                Reset
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={async () => {
                  if (controlGroupApi) {
                    saveNotification$.next();
                    setControlGroupSerializedState(await controlGroupApi.serializeState());
                  }
                }}
              >
                Save
              </EuiButton>
            </EuiFlexItem>
          </>
        )}
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
        onRefresh={() => {
          reload$.next();
        }}
      />
      {hasControls && <EuiSpacer size="m" />}
      <ReactEmbeddableRenderer
        onApiAvailable={(api) => {
          dashboardApi?.setChild(api);
          setControlGroupApi(api as ControlGroupApi);
        }}
        hidePanelChrome={true}
        type={CONTROL_GROUP_TYPE}
        getParentApi={() => ({
          ...dashboardApi,
          getSerializedStateForChild: getControlGroupSerializedState,
          getRuntimeStateForChild: getControlGroupRuntimeState,
        })}
        panelProps={{ hideLoader: true }}
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
