/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import { BehaviorSubject, combineLatest, of, Subject } from 'rxjs';
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
  OnTimeChangeProps,
} from '@elastic/eui';
import { CONTROLS_GROUP_TYPE } from '@kbn/controls-constants';
import { ControlGroupApi } from '@kbn/controls-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { combineCompatibleChildrenApis } from '@kbn/presentation-containers';
import {
  apiPublishesDataLoading,
  PublishesDataLoading,
  SerializedPanelState,
  useBatchedPublishingSubjects,
  ViewMode,
} from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { ControlsGroupState } from '@kbn/controls-schemas';

import { savedStateManager, unsavedStateManager, WEB_LOGS_DATA_VIEW_ID } from './session_storage';

const toggleViewButtons = [
  {
    id: `viewModeToggle_edit`,
    value: 'edit',
    label: 'Edit mode',
  },
  {
    id: `viewModeToggle_view`,
    value: 'view',
    label: 'View mode',
  },
];

const CONTROL_GROUP_EMBEDDABLE_ID = 'CONTROL_GROUP_EMBEDDABLE_ID';

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
    return new BehaviorSubject<ViewMode>('edit');
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

  const parentApi = useMemo(() => {
    const query$ = new BehaviorSubject<Query | AggregateQuery | undefined>(undefined);
    const unsavedSavedControlGroupState = unsavedStateManager.get();
    const lastSavedControlGroupState = savedStateManager.get();
    const lastSavedControlGroupState$ = new BehaviorSubject(lastSavedControlGroupState);

    return {
      dataLoading$,
      unifiedSearchFilters$,
      viewMode$,
      filters$,
      query$,
      timeRange$,
      timeslice$,
      reload$,
      getSerializedStateForChild: (childId: string) => {
        if (childId === CONTROL_GROUP_EMBEDDABLE_ID) {
          return unsavedSavedControlGroupState
            ? unsavedSavedControlGroupState
            : lastSavedControlGroupState;
        }

        return {
          rawState: {},
          references: [],
        };
      },
      lastSavedStateForChild$: (childId: string) => {
        return childId === CONTROL_GROUP_EMBEDDABLE_ID
          ? lastSavedControlGroupState$
          : of(undefined);
      },
      getLastSavedStateForChild: (childId: string) => {
        return childId === CONTROL_GROUP_EMBEDDABLE_ID
          ? lastSavedControlGroupState$.value
          : {
              rawState: {},
              references: [],
            };
      },
      setLastSavedControlGroupState: (savedState: SerializedPanelState<ControlsGroupState>) => {
        lastSavedControlGroupState$.next(savedState);
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const subscription = combineCompatibleChildrenApis<PublishesDataLoading, boolean | undefined>(
      parentApi,
      'dataLoading$',
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
  }, [parentApi, dataLoading$]);

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

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  useEffect(() => {
    if (!controlGroupApi) {
      return;
    }
    const subscription = controlGroupApi.hasUnsavedChanges$.subscribe((nextHasUnsavedChanges) => {
      if (!nextHasUnsavedChanges) {
        unsavedStateManager.clear();
        setHasUnsavedChanges(false);
        return;
      }

      unsavedStateManager.set(controlGroupApi.serializeState());
      setHasUnsavedChanges(true);
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
              savedStateManager.clear();
              unsavedStateManager.clear();
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
                  core
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
        {hasUnsavedChanges && viewMode === 'edit' && (
          <>
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning">Unsaved changes</EuiBadge>
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
                  await controlGroupApi.resetUnsavedChanges();
                  if (isMounted()) setIsResetting(false);
                }}
              >
                Reset
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                disabled={!controlGroupApi}
                onClick={() => {
                  if (!controlGroupApi) {
                    return;
                  }
                  const savedState = controlGroupApi.serializeState();
                  parentApi.setLastSavedControlGroupState(savedState);
                  savedStateManager.set(savedState);
                  unsavedStateManager.clear();
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
      <EmbeddableRenderer
        type={CONTROLS_GROUP_TYPE}
        maybeId={CONTROL_GROUP_EMBEDDABLE_ID}
        onApiAvailable={(api) => {
          setControlGroupApi(api as ControlGroupApi);
        }}
        hidePanelChrome={true}
        getParentApi={() => parentApi}
        panelProps={{ hideLoader: true }}
      />
      <EuiSpacer size="l" />
      {isControlGroupInitialized && (
        <div style={{ height: '400px' }}>
          <EmbeddableRenderer
            type={'search_embeddable'}
            getParentApi={() => parentApi}
            hidePanelChrome={false}
          />
        </div>
      )}
    </>
  );
};
