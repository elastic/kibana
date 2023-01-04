/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { cloneDeep, omit } from 'lodash';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';

import {
  lazyLoadReduxEmbeddablePackage,
  ReduxEmbeddableTools,
} from '@kbn/presentation-util-plugin/public';
import {
  ViewMode,
  Container,
  type Embeddable,
  type IEmbeddable,
  type EmbeddableInput,
  type EmbeddableOutput,
  type EmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import type { Filter, TimeRange, Query } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import type { RefreshInterval } from '@kbn/data-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import type { ControlGroupContainer } from '@kbn/controls-plugin/public';
import type { KibanaExecutionContext, OverlayRef } from '@kbn/core/public';
import { ExitFullScreenButtonKibanaProvider } from '@kbn/shared-ux-button-exit-full-screen';

import {
  runClone,
  runSaveAs,
  showOptions,
  runQuickSave,
  replacePanel,
  addFromLibrary,
  showPlaceholderUntil,
  addOrUpdateEmbeddable,
} from './api';
import {
  DashboardPanelState,
  DashboardContainerInput,
  DashboardContainerByValueInput,
} from '../../../common';
import {
  startDiffingDashboardState,
  startControlGroupIntegration,
  startUnifiedSearchIntegration,
  startSyncingDashboardDataViews,
  startDashboardSearchSessionIntegration,
  combineDashboardFiltersWithControlGroupFilters,
  getUnsavedChanges,
  keysNotConsideredUnsavedChanges,
} from './integrations';
import { DASHBOARD_CONTAINER_TYPE } from '../..';
import { createPanelState } from '../component/panel';
import { pluginServices } from '../../services/plugin_services';
import { DASHBOARD_LOADED_EVENT } from '../../dashboard_constants';
import { DashboardCreationOptions } from './dashboard_container_factory';
import { DashboardContainerOutput, DashboardReduxState } from '../types';
import { DashboardAnalyticsService } from '../../services/analytics/types';
import { DashboardViewport } from '../component/viewport/dashboard_viewport';
import { dashboardContainerReducers } from '../state/dashboard_container_reducers';
import { DashboardSavedObjectService } from '../../services/dashboard_saved_object/types';
import { dashboardContainerInputIsByValue } from '../../../common/dashboard_container/type_guards';

export interface DashboardLoadedInfo {
  timeToData: number;
  timeToDone: number;
  numOfPanels: number;
  status: string;
}

export interface InheritedChildInput {
  filters: Filter[];
  query: Query;
  timeRange?: TimeRange;
  timeslice?: [number, number];
  refreshConfig?: RefreshInterval;
  viewMode: ViewMode;
  hidePanelTitles?: boolean;
  id: string;
  searchSessionId?: string;
  syncColors?: boolean;
  syncCursor?: boolean;
  syncTooltips?: boolean;
  executionContext?: KibanaExecutionContext;
}

export class DashboardContainer extends Container<InheritedChildInput, DashboardContainerInput> {
  public readonly type = DASHBOARD_CONTAINER_TYPE;
  public controlGroup?: ControlGroupContainer;

  // Dashboard State
  private onDestroyControlGroup?: () => void;
  private subscriptions: Subscription = new Subscription();

  private initialized$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private initialSavedDashboardId?: string;

  private reduxEmbeddableTools?: ReduxEmbeddableTools<
    DashboardReduxState,
    typeof dashboardContainerReducers
  >;

  private domNode?: HTMLElement;
  private overlayRef?: OverlayRef;
  private allDataViews: DataView[] = [];

  // Services that are used in the Dashboard container code
  private creationOptions?: DashboardCreationOptions;
  private analyticsService: DashboardAnalyticsService;
  private dashboardSavedObjectService: DashboardSavedObjectService;
  private theme$;
  private chrome;

  constructor(
    initialInput: DashboardContainerInput,
    parent?: Container,
    creationOptions?: DashboardCreationOptions
  ) {
    // we won't initialize any embeddable children until after the dashboard is done initializing.
    const readyToInitializeChildren$ = new Subject<DashboardContainerInput>();
    const {
      embeddable: { getEmbeddableFactory },
    } = pluginServices.getServices();

    super(
      {
        ...initialInput,
      },
      { embeddableLoaded: {} },
      getEmbeddableFactory,
      parent,
      {
        readyToInitializeChildren$,
      }
    );

    ({
      analytics: this.analyticsService,
      dashboardSavedObject: this.dashboardSavedObjectService,
      settings: {
        theme: { theme$: this.theme$ },
      },
      chrome: this.chrome,
    } = pluginServices.getServices());

    this.initialSavedDashboardId = dashboardContainerInputIsByValue(this.input)
      ? undefined
      : this.input.savedObjectId;
    this.creationOptions = creationOptions;
    this.initializeDashboard(readyToInitializeChildren$, creationOptions);
  }

  public getDashboardSavedObjectId() {
    if (this.initialized$.value) {
      return this.getReduxEmbeddableTools().getState().componentState.lastSavedId;
    }
    return this.initialSavedDashboardId;
  }

  public getInputAsValueType = () => {
    if (!dashboardContainerInputIsByValue(this.input)) {
      throw new Error('cannot get input as value type until after dashboard input is unwrapped.');
    }
    return this.getInput() as DashboardContainerByValueInput;
  };

  private async unwrapDashboardContainerInput(): Promise<
    DashboardContainerByValueInput | undefined
  > {
    if (dashboardContainerInputIsByValue(this.input)) {
      return this.input;
    }
    const unwrapResult = await this.dashboardSavedObjectService.loadDashboardStateFromSavedObject({
      id: this.input.savedObjectId,
    });
    this.updateInput({ savedObjectId: undefined });
    if (
      !this.creationOptions?.validateLoadedSavedObject ||
      this.creationOptions.validateLoadedSavedObject(unwrapResult)
    ) {
      return unwrapResult.dashboardInput;
    }
  }

  private async initializeDashboard(
    readyToInitializeChildren$: Subject<DashboardContainerInput>,
    creationOptions?: DashboardCreationOptions
  ) {
    const {
      data: { dataViews },
    } = pluginServices.getServices();

    const reduxEmbeddablePackagePromise = lazyLoadReduxEmbeddablePackage();
    const defaultDataViewAssignmentPromise = dataViews.getDefaultDataView();
    const dashboardStateUnwrapPromise = this.unwrapDashboardContainerInput();

    const [reduxEmbeddablePackage, inputFromSavedObject, defaultDataView] = await Promise.all([
      reduxEmbeddablePackagePromise,
      dashboardStateUnwrapPromise,
      defaultDataViewAssignmentPromise,
    ]);

    if (!defaultDataView) {
      throw new Error('Dashboard requires at least one data view before it can be initialized.');
    }

    // inputFromSavedObject will only be undefined if the provided valiation function returns false.
    if (!inputFromSavedObject) {
      this.destroy();
      return;
    }

    // Gather input from session storage if integration is used
    let sessionStorageInput: Partial<DashboardContainerByValueInput> = {};
    if (creationOptions?.useSessionStorageIntegration) {
      const { dashboardSessionStorage } = pluginServices.getServices();
      const sessionInput = dashboardSessionStorage.getState(this.initialSavedDashboardId);
      if (sessionInput) sessionStorageInput = sessionInput;
    }

    // Combine input from saved object with override input.
    const initialInput: DashboardContainerByValueInput = cloneDeep({
      ...inputFromSavedObject,
      ...sessionStorageInput,
      ...creationOptions?.overrideInput,
    });

    // set up execution context
    initialInput.executionContext = {
      type: 'dashboard',
      description: initialInput.title,
    };

    // set up unified search integration
    if (
      creationOptions?.useUnifiedSearchIntegration &&
      creationOptions.unifiedSearchSettings?.kbnUrlStateStorage
    ) {
      const { kbnUrlStateStorage } = creationOptions.unifiedSearchSettings;
      const initialTimeRange = startUnifiedSearchIntegration.bind(this)({
        initialInput,
        kbnUrlStateStorage,
        setCleanupFunction: (cleanup) => {
          this.stopSyncingWithUnifiedSearch = cleanup;
        },
      });
      if (initialTimeRange) initialInput.timeRange = initialTimeRange;
    }

    // place the incoming embeddable if there is one
    const incomingEmbeddable = creationOptions?.incomingEmbeddable;
    if (incomingEmbeddable) {
      initialInput.viewMode = ViewMode.EDIT; // view mode must always be edit to recieve an embeddable.
      if (
        incomingEmbeddable.embeddableId &&
        Boolean(initialInput.panels[incomingEmbeddable.embeddableId])
      ) {
        // this embeddable already exists, we will update the explicit input.
        const panelToUpdate = initialInput.panels[incomingEmbeddable.embeddableId];
        const sameType = panelToUpdate.type === incomingEmbeddable.type;

        panelToUpdate.type = incomingEmbeddable.type;
        panelToUpdate.explicitInput = {
          // if the incoming panel is the same type as what was there before we can safely spread the old panel's explicit input
          ...(sameType ? panelToUpdate.explicitInput : {}),

          ...incomingEmbeddable.input,
          id: incomingEmbeddable.embeddableId,

          // maintain hide panel titles setting.
          hidePanelTitles: panelToUpdate.explicitInput.hidePanelTitles,
        };
      } else {
        // otherwise this incoming embeddable is brand new and can be added via the default method after the dashboard container is created.
        this.untilInitialized().then(() =>
          this.addNewEmbeddable(incomingEmbeddable.type, incomingEmbeddable.input)
        );
      }
    }

    // start search sessions integration
    if (creationOptions?.useSearchSessionsIntegration) {
      const { initialSearchSessionId, stopSyncingDashboardSearchSessions } =
        startDashboardSearchSessionIntegration.bind(this)(
          creationOptions?.searchSessionSettings,
          incomingEmbeddable
        );
      initialInput.searchSessionId = initialSearchSessionId;
      this.stopSyncingDashboardSearchSessions = stopSyncingDashboardSearchSessions;
    }

    // update input so the redux embeddable tools get the unwrapped, initial input
    this.updateInput({ ...initialInput });

    // now that the input with the initial panel state has been set, we can tell the container class it's time to start loading children.
    readyToInitializeChildren$.next(initialInput);

    // build Control Group
    if (creationOptions?.useControlGroupIntegration) {
      this.controlGroup = await startControlGroupIntegration.bind(this)(initialInput);
    }

    // start diffing dashboard state
    const diffingMiddleware = startDiffingDashboardState.bind(this)({
      useSessionBackup: creationOptions?.useSessionStorageIntegration,
      setCleanupFunction: (cleanup) => {
        this.stopDiffingDashboardState = cleanup;
      },
    });

    // set up data views integration
    this.dataViewsChangeSubscription = startSyncingDashboardDataViews.bind(this)();

    // build redux embeddable tools
    this.reduxEmbeddableTools = reduxEmbeddablePackage.createTools<
      DashboardReduxState,
      typeof dashboardContainerReducers
    >({
      embeddable: this as Embeddable<DashboardContainerByValueInput, DashboardContainerOutput>, // cast to unwrapped state type
      reducers: dashboardContainerReducers,
      additionalMiddleware: [diffingMiddleware],
      initialComponentState: {
        lastSavedInput: inputFromSavedObject,
        hasUnsavedChanges: false, // if there is initial unsaved changes, the initial diff will catch them.
        lastSavedId: this.initialSavedDashboardId,
      },
    });

    this.initialized$.next(true);
  }

  public async untilInitialized() {
    if (this.initialized$.value) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const subscription = this.initialized$.subscribe((isInitialized) => {
        if (isInitialized) {
          resolve();
          subscription.unsubscribe();
        }
      });
    });
  }

  private onDataLoaded(data: DashboardLoadedInfo) {
    if (this.analyticsService) {
      reportPerformanceMetricEvent(this.analyticsService, {
        eventName: DASHBOARD_LOADED_EVENT,
        duration: data.timeToDone,
        key1: 'time_to_data',
        value1: data.timeToData,
        key2: 'num_of_panels',
        value2: data.numOfPanels,
      });
    }
  }

  protected createNewPanelState<
    TEmbeddableInput extends EmbeddableInput,
    TEmbeddable extends IEmbeddable<TEmbeddableInput, any>
  >(
    factory: EmbeddableFactory<TEmbeddableInput, any, TEmbeddable>,
    partial: Partial<TEmbeddableInput> = {}
  ): DashboardPanelState<TEmbeddableInput> {
    const panelState = super.createNewPanelState(factory, partial);
    const { newPanel } = createPanelState(panelState, this.input.panels);
    return newPanel;
  }

  public async getExplicitInputIsEqual(lastExplicitInput: DashboardContainerByValueInput) {
    const currentInput = this.getReduxEmbeddableTools().getState().explicitInput;
    return (
      omit(
        Object.keys(await getUnsavedChanges.bind(this)(lastExplicitInput, currentInput)),
        keysNotConsideredUnsavedChanges
      ).length > 0
    );
  }

  public getReduxEmbeddableTools() {
    if (!this.reduxEmbeddableTools) {
      throw new Error('Dashboard must be initialized before accessing redux embeddable tools');
    }
    return this.reduxEmbeddableTools;
  }

  public render(dom: HTMLElement) {
    if (!this.reduxEmbeddableTools) {
      throw new Error('Dashboard must be initialized before it can be rendered');
    }
    if (this.domNode) {
      ReactDOM.unmountComponentAtNode(this.domNode);
    }
    this.domNode = dom;

    const { Wrapper: DashboardReduxWrapper } = this.reduxEmbeddableTools;
    ReactDOM.render(
      <I18nProvider>
        <ExitFullScreenButtonKibanaProvider coreStart={{ chrome: this.chrome }}>
          <KibanaThemeProvider theme$={this.theme$}>
            <DashboardReduxWrapper>
              <DashboardViewport onDataLoaded={this.onDataLoaded.bind(this)} />
            </DashboardReduxWrapper>
          </KibanaThemeProvider>
        </ExitFullScreenButtonKibanaProvider>
      </I18nProvider>,
      dom
    );
  }

  protected getInheritedInput(id: string): InheritedChildInput {
    const {
      query,
      filters,
      viewMode,
      timeRange,
      timeslice,
      syncColors,
      syncTooltips,
      hidePanelTitles,
      searchSessionId,
      refreshInterval,
      executionContext,
    } = this.input as DashboardContainerByValueInput;

    let combinedFilters = filters;
    if (this.controlGroup) {
      combinedFilters = combineDashboardFiltersWithControlGroupFilters(filters, this.controlGroup);
    }
    return {
      refreshConfig: refreshInterval,
      filters: combinedFilters,
      hidePanelTitles,
      searchSessionId,
      executionContext,
      syncTooltips,
      syncColors,
      timeRange,
      timeslice,
      viewMode,
      query,
      id,
    };
  }

  // ------------------------------------------------------------------------------------------------------
  // Cleanup
  // ------------------------------------------------------------------------------------------------------
  private stopDiffingDashboardState?: () => void;
  private stopSyncingWithUnifiedSearch?: () => void;
  private dataViewsChangeSubscription?: Subscription = undefined;
  private stopSyncingDashboardSearchSessions: (() => void) | undefined;

  public destroy() {
    super.destroy();
    this.onDestroyControlGroup?.();
    this.subscriptions.unsubscribe();
    this.stopDiffingDashboardState?.();
    this.reduxEmbeddableTools?.cleanup();
    this.stopSyncingWithUnifiedSearch?.();
    this.stopSyncingDashboardSearchSessions?.();
    this.dataViewsChangeSubscription?.unsubscribe();
    if (this.domNode) ReactDOM.unmountComponentAtNode(this.domNode);
  }

  // ------------------------------------------------------------------------------------------------------
  // Dashboard API
  // ------------------------------------------------------------------------------------------------------

  /**
   * Sometimes when the ID changes, it's due to a clone operation, or a save as operation. In these cases,
   * most of the state hasn't actually changed, so there isn't any reason to destroy this container and
   * load up a fresh one. When an id change is in progress, the renderer can check this method, and if it returns
   * true, the renderer can safely skip destroying and rebuilding the container.
   */
  public isExpectingIdChange() {
    return this.expectingIdChange;
  }
  private expectingIdChange = false;
  public expectIdChange() {
    /**
     * this.expectingIdChange = true; TODO - re-enable this for saving speed-ups. It causes some functional test failures because the _g param is not carried over.
     * See https://github.com/elastic/kibana/issues/147491 for more information.
     **/
    setTimeout(() => {
      this.expectingIdChange = false;
    }, 1); // turn this off after the next update.
  }

  public runClone = runClone;
  public runSaveAs = runSaveAs;
  public runQuickSave = runQuickSave;

  public showOptions = showOptions;
  public addFromLibrary = addFromLibrary;

  public replacePanel = replacePanel;
  public showPlaceholderUntil = showPlaceholderUntil;
  public addOrUpdateEmbeddable = addOrUpdateEmbeddable;

  public forceRefresh() {
    const {
      dispatch,
      actions: { setLastReloadRequestTimeToNow },
    } = this.getReduxEmbeddableTools();
    dispatch(setLastReloadRequestTimeToNow({}));
    this.controlGroup?.reload();
  }

  public onDataViewsUpdate$ = new Subject<DataView[]>();

  public resetToLastSavedState() {
    const {
      dispatch,
      getState,
      actions: { resetToLastSavedInput },
    } = this.getReduxEmbeddableTools();
    dispatch(resetToLastSavedInput({}));
    const {
      explicitInput: { timeRange, refreshInterval },
      componentState: {
        lastSavedInput: { timeRestore: lastSavedTimeRestore },
      },
    } = getState();

    // if we are using the unified search integration, we need to force reset the time picker.
    if (this.creationOptions?.useUnifiedSearchIntegration && lastSavedTimeRestore) {
      const {
        data: {
          query: {
            timefilter: { timefilter: timeFilterService },
          },
        },
      } = pluginServices.getServices();
      if (timeRange) timeFilterService.setTime(timeRange);
      if (refreshInterval) timeFilterService.setRefreshInterval(refreshInterval);
    }
  }

  /**
   * Gets all the dataviews that are actively being used in the dashboard
   * @returns An array of dataviews
   */
  public getAllDataViews = () => {
    return this.allDataViews;
  };

  /**
   * Use this to set the dataviews that are used in the dashboard when they change/update
   * @param newDataViews The new array of dataviews that will overwrite the old dataviews array
   */
  public setAllDataViews = (newDataViews: DataView[]) => {
    this.allDataViews = newDataViews;
    this.onDataViewsUpdate$.next(newDataViews);
  };

  public getExpandedPanelId = () => {
    if (!this.reduxEmbeddableTools) throw new Error();
    return this.reduxEmbeddableTools.getState().componentState.expandedPanelId;
  };

  public openOverlay = (ref: OverlayRef) => {
    this.clearOverlays();
    this.overlayRef = ref;
  };

  public clearOverlays = () => {
    this.controlGroup?.closeAllFlyouts();
    this.overlayRef?.close();
  };

  public setExpandedPanelId = (newId?: string) => {
    if (!this.reduxEmbeddableTools) throw new Error();
    const {
      actions: { setExpandedPanelId },
      dispatch,
    } = this.reduxEmbeddableTools;
    dispatch(setExpandedPanelId(newId));
  };

  public getPanelCount = () => {
    return Object.keys(this.getInput().panels).length;
  };

  public async getPanelTitles(): Promise<string[]> {
    const titles: string[] = [];
    const ids: string[] = Object.keys(this.getInput().panels);
    for (const panelId of ids) {
      await this.untilEmbeddableLoaded(panelId);
      const child: IEmbeddable<EmbeddableInput, EmbeddableOutput> = this.getChild(panelId);
      const title = child.getTitle();
      if (title) {
        titles.push(title);
      }
    }
    return titles;
  }
}
