/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ReactDOM from 'react-dom';
import { batch } from 'react-redux';
import { Subject, Subscription } from 'rxjs';
import React, { createContext, useContext } from 'react';

import {
  ViewMode,
  Container,
  type IEmbeddable,
  type EmbeddableInput,
  type EmbeddableOutput,
  type EmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import {
  getDefaultControlGroupInput,
  persistableControlGroupInputIsEqual,
} from '@kbn/controls-plugin/common';
import { I18nProvider } from '@kbn/i18n-react';
import { RefreshInterval } from '@kbn/data-plugin/public';
import type { Filter, TimeRange, Query } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import type { ControlGroupContainer } from '@kbn/controls-plugin/public';
import type { KibanaExecutionContext, OverlayRef } from '@kbn/core/public';
import { ExitFullScreenButtonKibanaProvider } from '@kbn/shared-ux-button-exit-full-screen';
import { ReduxToolsPackage, ReduxEmbeddableTools } from '@kbn/presentation-util-plugin/public';

import {
  runClone,
  runSaveAs,
  showSettings,
  runQuickSave,
  replacePanel,
  addFromLibrary,
  addOrUpdateEmbeddable,
} from './api';

import {
  DashboardPublicState,
  DashboardReduxState,
  DashboardRenderPerformanceStats,
} from '../types';
import { DASHBOARD_CONTAINER_TYPE } from '../..';
import { placePanel } from '../component/panel_placement';
import { pluginServices } from '../../services/plugin_services';
import { initializeDashboard } from './create/create_dashboard';
import { DASHBOARD_APP_ID, DASHBOARD_LOADED_EVENT } from '../../dashboard_constants';
import { DashboardCreationOptions } from './dashboard_container_factory';
import { DashboardAnalyticsService } from '../../services/analytics/types';
import { DashboardViewport } from '../component/viewport/dashboard_viewport';
import { DashboardPanelState, DashboardContainerInput } from '../../../common';
import { dashboardContainerReducers } from '../state/dashboard_container_reducers';
import { startDiffingDashboardState } from '../state/diffing/dashboard_diffing_integration';
import { combineDashboardFiltersWithControlGroupFilters } from './create/controls/dashboard_control_group_integration';
import { DashboardCapabilitiesService } from '../../services/dashboard_capabilities/types';

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

export class DashboardContainer extends Container<InheritedChildInput, DashboardContainerInput> {
  public readonly type = DASHBOARD_CONTAINER_TYPE;

  // state management
  public select: DashboardReduxEmbeddableTools['select'];
  public getState: DashboardReduxEmbeddableTools['getState'];
  public dispatch: DashboardReduxEmbeddableTools['dispatch'];
  public onStateChange: DashboardReduxEmbeddableTools['onStateChange'];

  public integrationSubscriptions: Subscription = new Subscription();
  public diffingSubscription: Subscription = new Subscription();
  public controlGroup?: ControlGroupContainer;

  public searchSessionId?: string;
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
    const diffingMiddleware = startDiffingDashboardState.bind(this)(creationOptions);

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

  public replacePanel = replacePanel;
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
        lastSavedInput: {
          controlGroupInput: lastSavedControlGroupInput,
          timeRestore: lastSavedTimeRestore,
        },
      },
    } = this.getState();

    if (
      this.controlGroup &&
      !persistableControlGroupInputIsEqual(this.controlGroup.getInput(), lastSavedControlGroupInput)
    ) {
      this.controlGroup.updateInput(lastSavedControlGroupInput ?? getDefaultControlGroupInput());
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

    this.updateInput(newInput);
    batch(() => {
      this.dispatch.setLastSavedInput(loadDashboardReturn?.dashboardInput);
      this.dispatch.setManaged(loadDashboardReturn?.managed);
      this.dispatch.setAnimatePanelTransforms(false); // prevents panels from animating on navigate.
      this.dispatch.setLastSavedId(newSavedObjectId);
    });
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
  };
}
