/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPE } from '@kbn/analytics';
import { Reference } from '@kbn/content-management-utils';
import type { ControlGroupContainer } from '@kbn/controls-plugin/public';
import type { KibanaExecutionContext, OverlayRef } from '@kbn/core/public';
import { getPanelTitle } from '@kbn/presentation-publishing';
import { RefreshInterval } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import {
  Container,
  DefaultEmbeddableApi,
  EmbeddableFactoryNotFoundError,
  isExplicitInputWithAttributes,
  PanelNotFoundError,
  reactEmbeddableRegistryHasKey,
  ViewMode,
  type EmbeddableFactory,
  type EmbeddableInput,
  type EmbeddableOutput,
  type IEmbeddable,
} from '@kbn/embeddable-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { PanelPackage } from '@kbn/presentation-publishing';
import { ReduxEmbeddableTools, ReduxToolsPackage } from '@kbn/presentation-util-plugin/public';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { ExitFullScreenButtonKibanaProvider } from '@kbn/shared-ux-button-exit-full-screen';
import deepEqual from 'fast-deep-equal';
import { omit } from 'lodash';
import React, { createContext, useContext } from 'react';
import ReactDOM from 'react-dom';
import { batch } from 'react-redux';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { v4 } from 'uuid';
import { DashboardLocatorParams, DASHBOARD_CONTAINER_TYPE } from '../..';
import { DashboardContainerInput, DashboardPanelState } from '../../../common';
import { getReferencesForPanelId } from '../../../common/dashboard_container/persistable_state/dashboard_container_references';
import { dashboardReplacePanelActionStrings } from '../../dashboard_actions/_dashboard_actions_strings';
import {
  DASHBOARD_APP_ID,
  DASHBOARD_LOADED_EVENT,
  DASHBOARD_UI_METRIC_ID,
  DEFAULT_PANEL_HEIGHT,
  DEFAULT_PANEL_WIDTH,
} from '../../dashboard_constants';
import { DashboardAnalyticsService } from '../../services/analytics/types';
import { DashboardCapabilitiesService } from '../../services/dashboard_capabilities/types';
import { pluginServices } from '../../services/plugin_services';
import { placePanel } from '../component/panel_placement';
import { panelPlacementStrategies } from '../component/panel_placement/place_new_panel_strategies';
import { DashboardViewport } from '../component/viewport/dashboard_viewport';
import { DashboardExternallyAccessibleApi } from '../external_api/dashboard_api';
import { dashboardContainerReducers } from '../state/dashboard_container_reducers';
import { getDiffingMiddleware } from '../state/diffing/dashboard_diffing_integration';
import {
  DashboardPublicState,
  DashboardReduxState,
  DashboardRenderPerformanceStats,
} from '../types';
import {
  addFromLibrary,
  addOrUpdateEmbeddable,
  runClone,
  runQuickSave,
  runSaveAs,
  showSettings,
} from './api';
import { duplicateDashboardPanel } from './api/duplicate_dashboard_panel';
import { combineDashboardFiltersWithControlGroupFilters } from './create/controls/dashboard_control_group_integration';
import { initializeDashboard } from './create/create_dashboard';
import {
  DashboardCreationOptions,
  dashboardTypeDisplayLowercase,
  dashboardTypeDisplayName,
} from './dashboard_container_factory';

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

type DashboardReduxEmbeddableTools = ReduxEmbeddableTools<
  DashboardReduxState,
  typeof dashboardContainerReducers
>;

export const DashboardContainerContext = createContext<DashboardContainer | null>(null);
export const useDashboardContainer = (): DashboardContainer => {
  const dashboard = useContext<DashboardContainer | null>(DashboardContainerContext);
  if (dashboard == null) {
    throw new Error('useDashboardContainer must be used inside DashboardContainerContext.');
  }
  return dashboard!;
};

export class DashboardContainer
  extends Container<InheritedChildInput, DashboardContainerInput>
  implements DashboardExternallyAccessibleApi
{
  public readonly type = DASHBOARD_CONTAINER_TYPE;

  // state management
  public select: DashboardReduxEmbeddableTools['select'];
  public getState: DashboardReduxEmbeddableTools['getState'];
  public dispatch: DashboardReduxEmbeddableTools['dispatch'];
  public onStateChange: DashboardReduxEmbeddableTools['onStateChange'];
  public anyReducerRun: Subject<null> = new Subject();

  public integrationSubscriptions: Subscription = new Subscription();
  public publishingSubscription: Subscription = new Subscription();
  public diffingSubscription: Subscription = new Subscription();
  public controlGroup?: ControlGroupContainer;

  public searchSessionId?: string;
  public locator?: Pick<LocatorPublic<DashboardLocatorParams>, 'navigate' | 'getRedirectUrl'>;

  // cleanup
  public stopSyncingWithUnifiedSearch?: () => void;
  private cleanupStateTools: () => void;

  // performance monitoring
  private dashboardCreationStartTime?: number;
  private savedObjectLoadTime?: number;

  private domNode?: HTMLElement;
  private overlayRef?: OverlayRef;
  private allDataViews: DataView[] = [];

  // Services that are used in the Dashboard container code
  private creationOptions?: DashboardCreationOptions;
  private analyticsService: DashboardAnalyticsService;
  private showWriteControls: DashboardCapabilitiesService['showWriteControls'];
  private theme$;
  private chrome;
  private customBranding;

  private trackPanelAddMetric:
    | ((type: string, eventNames: string | string[], count?: number | undefined) => void)
    | undefined;
  // new embeddable framework
  public reactEmbeddableChildren: BehaviorSubject<{ [key: string]: DefaultEmbeddableApi }> =
    new BehaviorSubject<{ [key: string]: DefaultEmbeddableApi }>({});
  public savedObjectReferences: Reference[] = [];

  constructor(
    initialInput: DashboardContainerInput,
    reduxToolsPackage: ReduxToolsPackage,
    initialSessionId?: string,
    dashboardCreationStartTime?: number,
    parent?: Container,
    creationOptions?: DashboardCreationOptions,
    initialComponentState?: DashboardPublicState
  ) {
    const {
      usageCollection,
      embeddable: { getEmbeddableFactory },
    } = pluginServices.getServices();
    super(
      {
        ...initialInput,
      },
      { embeddableLoaded: {} },
      getEmbeddableFactory,
      parent
    );

    this.trackPanelAddMetric = usageCollection.reportUiCounter?.bind(
      usageCollection,
      DASHBOARD_UI_METRIC_ID
    );

    ({
      analytics: this.analyticsService,
      settings: {
        theme: { theme$: this.theme$ },
      },
      chrome: this.chrome,
      customBranding: this.customBranding,
      dashboardCapabilities: { showWriteControls: this.showWriteControls },
    } = pluginServices.getServices());

    this.creationOptions = creationOptions;
    this.searchSessionId = initialSessionId;
    this.dashboardCreationStartTime = dashboardCreationStartTime;

    // start diffing dashboard state
    const diffingMiddleware = getDiffingMiddleware.bind(this)();

    // build redux embeddable tools
    const reduxTools = reduxToolsPackage.createReduxEmbeddableTools<
      DashboardReduxState,
      typeof dashboardContainerReducers
    >({
      embeddable: this,
      reducers: dashboardContainerReducers,
      additionalMiddleware: [diffingMiddleware],
      initialComponentState,
    });
    this.onStateChange = reduxTools.onStateChange;
    this.cleanupStateTools = reduxTools.cleanup;
    this.getState = reduxTools.getState;
    this.dispatch = reduxTools.dispatch;
    this.select = reduxTools.select;

    this.savedObjectId = new BehaviorSubject(this.getDashboardSavedObjectId());
    this.publishingSubscription.add(
      this.onStateChange(() => {
        if (this.savedObjectId.value === this.getDashboardSavedObjectId()) return;
        this.savedObjectId.next(this.getDashboardSavedObjectId());
      })
    );

    this.expandedPanelId = new BehaviorSubject(this.getDashboardSavedObjectId());
    this.publishingSubscription.add(
      this.onStateChange(() => {
        if (this.expandedPanelId.value === this.getExpandedPanelId()) return;
        this.expandedPanelId.next(this.getExpandedPanelId());
      })
    );
    this.startAuditingReactEmbeddableChildren();
  }

  public getAppContext() {
    const embeddableAppContext = this.creationOptions?.getEmbeddableAppContext?.(
      this.getDashboardSavedObjectId()
    );
    return {
      ...embeddableAppContext,
      currentAppId: embeddableAppContext?.currentAppId ?? DASHBOARD_APP_ID,
    };
  }

  public getDashboardSavedObjectId() {
    return this.getState().componentState.lastSavedId;
  }

  public reportPerformanceMetrics(stats: DashboardRenderPerformanceStats) {
    if (this.analyticsService && this.dashboardCreationStartTime) {
      const panelCount = Object.keys(this.getState().explicitInput.panels).length;
      const totalDuration = stats.panelsRenderDoneTime - this.dashboardCreationStartTime;
      reportPerformanceMetricEvent(this.analyticsService, {
        eventName: DASHBOARD_LOADED_EVENT,
        duration: totalDuration,
        key1: 'time_to_data',
        value1: (stats.lastTimeToData || stats.panelsRenderDoneTime) - stats.panelsRenderStartTime,
        key2: 'num_of_panels',
        value2: panelCount,
        key3: 'total_load_time',
        value3: totalDuration,
        key4: 'saved_object_load_time',
        value4: this.savedObjectLoadTime,
      });
    }
  }

  protected createNewPanelState<
    TEmbeddableInput extends EmbeddableInput,
    TEmbeddable extends IEmbeddable<TEmbeddableInput, any>
  >(
    factory: EmbeddableFactory<TEmbeddableInput, any, TEmbeddable>,
    partial: Partial<TEmbeddableInput> = {},
    attributes?: unknown
  ): {
    newPanel: DashboardPanelState<TEmbeddableInput>;
    otherPanels: DashboardContainerInput['panels'];
  } {
    const { newPanel } = super.createNewPanelState(factory, partial, attributes);
    return placePanel(factory, newPanel, this.input.panels, attributes);
  }

  public render(dom: HTMLElement) {
    if (this.domNode) {
      ReactDOM.unmountComponentAtNode(this.domNode);
    }
    this.domNode = dom;
    this.domNode.className = 'dashboardContainer';

    ReactDOM.render(
      <I18nProvider>
        <ExitFullScreenButtonKibanaProvider
          coreStart={{ chrome: this.chrome, customBranding: this.customBranding }}
        >
          <KibanaThemeProvider theme$={this.theme$}>
            <DashboardContainerContext.Provider value={this}>
              <DashboardViewport />
            </DashboardContainerContext.Provider>
          </KibanaThemeProvider>
        </ExitFullScreenButtonKibanaProvider>
      </I18nProvider>,
      dom
    );
  }

  public updateInput(changes: Partial<DashboardContainerInput>): void {
    // block the Dashboard from entering edit mode if this Dashboard is managed.
    if (
      (this.getState().componentState.managed || !this.showWriteControls) &&
      changes.viewMode?.toLowerCase() === ViewMode.EDIT?.toLowerCase()
    ) {
      const { viewMode, ...rest } = changes;
      super.updateInput(rest);
      return;
    }
    super.updateInput(changes);
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
      refreshInterval,
      executionContext,
      panels,
    } = this.input;

    let combinedFilters = filters;
    if (this.controlGroup) {
      combinedFilters = combineDashboardFiltersWithControlGroupFilters(filters, this.controlGroup);
    }
    const hasCustomTimeRange = Boolean(
      (panels[id]?.explicitInput as Partial<InheritedChildInput>)?.timeRange
    );
    return {
      searchSessionId: this.searchSessionId,
      refreshConfig: refreshInterval,
      filters: combinedFilters,
      hidePanelTitles,
      executionContext,
      syncTooltips,
      syncColors,
      viewMode,
      query,
      id,
      // do not pass any time information from dashboard to panel when panel has custom time range
      // to avoid confusing panel which timeRange should be used
      timeRange: hasCustomTimeRange ? undefined : timeRange,
      timeslice: hasCustomTimeRange ? undefined : timeslice,
    };
  }

  // ------------------------------------------------------------------------------------------------------
  // Cleanup
  // ------------------------------------------------------------------------------------------------------
  public destroy() {
    super.destroy();
    this.cleanupStateTools();
    this.controlGroup?.destroy();
    this.diffingSubscription.unsubscribe();
    this.publishingSubscription.unsubscribe();
    this.integrationSubscriptions.unsubscribe();
    this.stopSyncingWithUnifiedSearch?.();
    if (this.domNode) ReactDOM.unmountComponentAtNode(this.domNode);
  }

  // ------------------------------------------------------------------------------------------------------
  // Dashboard API
  // ------------------------------------------------------------------------------------------------------

  public runClone = runClone;
  public runSaveAs = runSaveAs;
  public runQuickSave = runQuickSave;

  public showSettings = showSettings;
  public addFromLibrary = addFromLibrary;

  public duplicatePanel(id: string) {
    duplicateDashboardPanel.bind(this)(id);
  }

  public canRemovePanels = () => !this.getExpandedPanelId();

  public getTypeDisplayName = () => dashboardTypeDisplayName;
  public getTypeDisplayNameLowerCase = () => dashboardTypeDisplayLowercase;

  public savedObjectId: BehaviorSubject<string | undefined>;
  public expandedPanelId: BehaviorSubject<string | undefined>;

  public async replacePanel(idToRemove: string, { panelType, initialState }: PanelPackage) {
    const newId = await this.replaceEmbeddable(
      idToRemove,
      initialState as Partial<EmbeddableInput>,
      panelType,
      true
    );
    if (this.getExpandedPanelId() !== undefined) {
      this.setExpandedPanelId(newId);
    }
    this.setHighlightPanelId(newId);
    return newId;
  }

  public async addNewPanel<ApiType extends unknown = unknown>(
    panelPackage: PanelPackage,
    displaySuccessMessage?: boolean
  ) {
    const {
      notifications: { toasts },
      embeddable: { getEmbeddableFactory },
    } = pluginServices.getServices();

    const onSuccess = (id?: string, title?: string) => {
      if (!displaySuccessMessage) return;
      toasts.addSuccess({
        title: dashboardReplacePanelActionStrings.getSuccessMessage(title),
        'data-test-subj': 'addEmbeddableToDashboardSuccess',
      });
      this.setScrollToPanelId(id);
      this.setHighlightPanelId(id);
    };

    if (this.trackPanelAddMetric) {
      this.trackPanelAddMetric(METRIC_TYPE.CLICK, panelPackage.panelType);
    }
    if (reactEmbeddableRegistryHasKey(panelPackage.panelType)) {
      const newId = v4();
      const { newPanelPlacement, otherPanels } = panelPlacementStrategies.findTopLeftMostOpenSpace({
        currentPanels: this.getInput().panels,
        height: DEFAULT_PANEL_HEIGHT,
        width: DEFAULT_PANEL_WIDTH,
      });
      const newPanel: DashboardPanelState = {
        type: panelPackage.panelType,
        gridData: {
          ...newPanelPlacement,
          i: newId,
        },
        explicitInput: {
          ...panelPackage.initialState,
          id: newId,
        },
      };
      this.updateInput({ panels: { ...otherPanels, [newId]: newPanel } });
      onSuccess(newId, newPanel.explicitInput.title);
      return;
    }

    const embeddableFactory = getEmbeddableFactory(panelPackage.panelType);
    if (!embeddableFactory) {
      throw new EmbeddableFactoryNotFoundError(panelPackage.panelType);
    }
    const initialInput = panelPackage.initialState as Partial<EmbeddableInput>;

    let explicitInput: Partial<EmbeddableInput>;
    let attributes: unknown;
    try {
      if (initialInput) {
        explicitInput = initialInput;
      } else {
        const explicitInputReturn = await embeddableFactory.getExplicitInput(undefined, this);
        if (isExplicitInputWithAttributes(explicitInputReturn)) {
          explicitInput = explicitInputReturn.newInput;
          attributes = explicitInputReturn.attributes;
        } else {
          explicitInput = explicitInputReturn;
        }
      }
    } catch (e) {
      // error likely means user canceled embeddable creation
      return;
    }

    const newEmbeddable = await this.addNewEmbeddable(
      embeddableFactory.type,
      explicitInput,
      attributes
    );

    if (newEmbeddable) {
      onSuccess(newEmbeddable.id, newEmbeddable.getTitle());
    }
    return newEmbeddable as ApiType;
  }

  public getDashboardPanelFromId = async (panelId: string) => {
    const panel = this.getInput().panels[panelId];
    if (reactEmbeddableRegistryHasKey(panel.type)) {
      const child = this.reactEmbeddableChildren.value[panelId];
      if (!child) throw new PanelNotFoundError();
      const serialized = await child.serializeState();
      return {
        type: panel.type,
        explicitInput: { ...panel.explicitInput, ...serialized.rawState },
        gridData: panel.gridData,
        version: serialized.version,
      };
    }
    return panel;
  };

  public expandPanel = (panelId?: string) => {
    this.setExpandedPanelId(panelId);

    if (!panelId) {
      this.setScrollToPanelId(panelId);
    }
  };

  public addOrUpdateEmbeddable = addOrUpdateEmbeddable;

  public forceRefresh(refreshControlGroup: boolean = true) {
    this.dispatch.setLastReloadRequestTimeToNow({});
    if (refreshControlGroup) this.controlGroup?.reload();
  }

  public onDataViewsUpdate$ = new Subject<DataView[]>();

  public resetToLastSavedState() {
    this.dispatch.resetToLastSavedInput({});
    const {
      explicitInput: { timeRange, refreshInterval },
      componentState: {
        lastSavedInput: { timeRestore: lastSavedTimeRestore },
      },
    } = this.getState();

    if (this.controlGroup) {
      this.controlGroup.resetToLastSavedState();
    }

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
    this.resetAllReactEmbeddables();
  }

  public navigateToDashboard = async (
    newSavedObjectId?: string,
    newCreationOptions?: Partial<DashboardCreationOptions>
  ) => {
    this.integrationSubscriptions.unsubscribe();
    this.integrationSubscriptions = new Subscription();
    this.stopSyncingWithUnifiedSearch?.();

    const {
      dashboardContentManagement: { loadDashboardState },
    } = pluginServices.getServices();
    if (newCreationOptions) {
      this.creationOptions = { ...this.creationOptions, ...newCreationOptions };
    }
    const loadDashboardReturn = await loadDashboardState({ id: newSavedObjectId });

    const dashboardContainerReady$ = new Subject<DashboardContainer>();
    const untilDashboardReady = () =>
      new Promise<DashboardContainer>((resolve) => {
        const subscription = dashboardContainerReady$.subscribe((container) => {
          subscription.unsubscribe();
          resolve(container);
        });
      });

    const initializeResult = await initializeDashboard({
      creationOptions: this.creationOptions,
      controlGroup: this.controlGroup,
      untilDashboardReady,
      loadDashboardReturn,
    });
    if (!initializeResult) return;
    const { input: newInput, searchSessionId } = initializeResult;

    this.searchSessionId = searchSessionId;

    batch(() => {
      this.dispatch.setLastSavedInput(
        omit(loadDashboardReturn?.dashboardInput, 'controlGroupInput')
      );
      this.dispatch.setManaged(loadDashboardReturn?.managed);
      if (this.controlGroup) {
        this.controlGroup.setSavedState(loadDashboardReturn.dashboardInput?.controlGroupInput);
      }
      this.dispatch.setAnimatePanelTransforms(false); // prevents panels from animating on navigate.
      this.dispatch.setLastSavedId(newSavedObjectId);
    });
    this.updateInput(newInput);
    dashboardContainerReady$.next(this);
  };

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
    return this.getState().componentState.expandedPanelId;
  };

  public setExpandedPanelId = (newId?: string) => {
    this.dispatch.setExpandedPanelId(newId);
  };

  public openOverlay = (ref: OverlayRef, options?: { focusedPanelId?: string }) => {
    this.clearOverlays();
    this.dispatch.setHasOverlays(true);
    this.overlayRef = ref;
    if (options?.focusedPanelId) {
      this.setFocusedPanelId(options?.focusedPanelId);
    }
  };

  public clearOverlays = () => {
    this.dispatch.setHasOverlays(false);
    this.dispatch.setFocusedPanelId(undefined);
    this.controlGroup?.closeAllFlyouts();
    this.overlayRef?.close();
  };

  public getPanelCount = () => {
    return Object.keys(this.getInput().panels).length;
  };

  public async getPanelTitles(): Promise<string[]> {
    const titles: string[] = [];
    for (const [id, panel] of Object.entries(this.getInput().panels)) {
      const title = await (async () => {
        if (reactEmbeddableRegistryHasKey(panel.type)) {
          return getPanelTitle(this.reactEmbeddableChildren.value[id]);
        }
        await this.untilEmbeddableLoaded(id);
        const child: IEmbeddable<EmbeddableInput, EmbeddableOutput> = this.getChild(id);
        if (!child) return undefined;
        return child.getTitle();
      })();
      if (title) titles.push(title);
    }
    return titles;
  }

  public setScrollToPanelId = (id: string | undefined) => {
    this.dispatch.setScrollToPanelId(id);
  };

  public scrollToPanel = async (panelRef: HTMLDivElement) => {
    const id = this.getState().componentState.scrollToPanelId;
    if (!id) return;

    this.untilEmbeddableLoaded(id).then(() => {
      this.setScrollToPanelId(undefined);
      panelRef.scrollIntoView({ block: 'center' });
    });
  };

  public scrollToTop = () => {
    window.scroll(0, 0);
  };

  public setHighlightPanelId = (id: string | undefined) => {
    this.dispatch.setHighlightPanelId(id);
  };

  public highlightPanel = (panelRef: HTMLDivElement) => {
    const id = this.getState().componentState.highlightPanelId;

    if (id && panelRef) {
      this.untilEmbeddableLoaded(id).then(() => {
        panelRef.classList.add('dshDashboardGrid__item--highlighted');
        // Removes the class after the highlight animation finishes
        setTimeout(() => {
          panelRef.classList.remove('dshDashboardGrid__item--highlighted');
        }, 5000);
      });
    }
    this.setHighlightPanelId(undefined);
  };

  public setFocusedPanelId = (id: string | undefined) => {
    this.dispatch.setFocusedPanelId(id);
    this.setScrollToPanelId(id);
  };

  // ------------------------------------------------------------------------------------------------------
  // React Embeddable system
  // ------------------------------------------------------------------------------------------------------
  public registerPanelApi = <ApiType extends unknown = unknown>(id: string, api: ApiType) => {
    this.reactEmbeddableChildren.next({
      ...this.reactEmbeddableChildren.value,
      [id]: api as DefaultEmbeddableApi,
    });
  };

  public getLastSavedStateForChild = (childId: string) => {
    const {
      componentState: {
        lastSavedInput: { panels },
      },
    } = this.getState();
    const panel: DashboardPanelState | undefined = panels[childId];

    const references = getReferencesForPanelId(childId, this.savedObjectReferences);
    return { rawState: panel?.explicitInput, version: panel?.version, references };
  };

  public removePanel(id: string) {
    const type = this.getInput().panels[id]?.type;
    this.removeEmbeddable(id);
    if (reactEmbeddableRegistryHasKey(type)) {
      const { [id]: childToRemove, ...otherChildren } = this.reactEmbeddableChildren.value;
      this.reactEmbeddableChildren.next(otherChildren);
    }
  }

  public startAuditingReactEmbeddableChildren = () => {
    const auditChildren = () => {
      const currentChildren = this.reactEmbeddableChildren.value;
      let panelsChanged = false;
      for (const panelId of Object.keys(currentChildren)) {
        if (!this.getInput().panels[panelId]) {
          delete currentChildren[panelId];
          panelsChanged = true;
        }
      }
      if (panelsChanged) this.reactEmbeddableChildren.next(currentChildren);
    };

    // audit children when panels change
    this.publishingSubscription.add(
      this.getInput$()
        .pipe(
          map(() => Object.keys(this.getInput().panels)),
          distinctUntilChanged(deepEqual)
        )
        .subscribe(() => auditChildren())
    );
    auditChildren();
  };

  public resetAllReactEmbeddables = () => {
    let resetChangedPanelCount = false;
    const currentChildren = this.reactEmbeddableChildren.value;
    for (const panelId of Object.keys(currentChildren)) {
      if (this.getInput().panels[panelId]) {
        currentChildren[panelId].resetUnsavedChanges();
      } else {
        // if reset resulted in panel removal, we need to update the list of children
        delete currentChildren[panelId];
        resetChangedPanelCount = true;
      }
    }
    if (resetChangedPanelCount) this.reactEmbeddableChildren.next(currentChildren);
  };

  public getFilters() {
    return this.getInput().filters;
  }

  public getQuery(): Query | undefined {
    return this.getInput().query;
  }
}
