/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext } from 'react';
import ReactDOM from 'react-dom';
import { Subject, Subscription } from 'rxjs';

import { ReduxToolsPackage, ReduxEmbeddableTools } from '@kbn/presentation-util-plugin/public';
import {
  ViewMode,
  Container,
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
  showSettings,
  runQuickSave,
  replacePanel,
  addFromLibrary,
  showPlaceholderUntil,
  addOrUpdateEmbeddable,
} from './api';

import { DASHBOARD_CONTAINER_TYPE } from '../..';
import { createPanelState } from '../component/panel';
import { pluginServices } from '../../services/plugin_services';
import { DashboardCreationOptions } from './dashboard_container_factory';
import { DashboardAnalyticsService } from '../../services/analytics/types';
import { DashboardViewport } from '../component/viewport/dashboard_viewport';
import { DashboardPanelState, DashboardContainerInput } from '../../../common';
import { DashboardReduxState, DashboardRenderPerformanceStats } from '../types';
import { dashboardContainerReducers } from '../state/dashboard_container_reducers';
import { startDiffingDashboardState } from '../state/diffing/dashboard_diffing_integration';
import { DASHBOARD_LOADED_EVENT, DEFAULT_DASHBOARD_INPUT } from '../../dashboard_constants';
import { combineDashboardFiltersWithControlGroupFilters } from './create/controls/dashboard_control_group_integration';

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

  public subscriptions: Subscription = new Subscription();
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
  private theme$;
  private chrome;
  private customBranding;

  constructor(
    initialInput: DashboardContainerInput,
    reduxToolsPackage: ReduxToolsPackage,
    initialSessionId?: string,
    initialLastSavedInput?: DashboardContainerInput,
    dashboardCreationStartTime?: number,
    parent?: Container,
    creationOptions?: DashboardCreationOptions,
    savedObjectId?: string
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
      initialComponentState: {
        lastSavedInput: initialLastSavedInput ?? {
          ...DEFAULT_DASHBOARD_INPUT,
          id: initialInput.id,
        },
        hasUnsavedChanges: false, // if there is initial unsaved changes, the initial diff will catch them.
        lastSavedId: savedObjectId,
      },
    });

    this.onStateChange = reduxTools.onStateChange;
    this.cleanupStateTools = reduxTools.cleanup;
    this.getState = reduxTools.getState;
    this.dispatch = reduxTools.dispatch;
    this.select = reduxTools.select;
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
    partial: Partial<TEmbeddableInput> = {}
  ): DashboardPanelState<TEmbeddableInput> {
    const panelState = super.createNewPanelState(factory, partial);
    const { newPanel } = createPanelState(panelState, this.input.panels);
    return newPanel;
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
    } = this.input;

    let combinedFilters = filters;
    if (this.controlGroup) {
      combinedFilters = combineDashboardFiltersWithControlGroupFilters(filters, this.controlGroup);
    }
    return {
      searchSessionId: this.searchSessionId,
      refreshConfig: refreshInterval,
      filters: combinedFilters,
      hidePanelTitles,
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
  public destroy() {
    super.destroy();
    this.cleanupStateTools();
    this.controlGroup?.destroy();
    this.subscriptions.unsubscribe();
    this.stopSyncingWithUnifiedSearch?.();
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

  public showSettings = showSettings;
  public addFromLibrary = addFromLibrary;

  public replacePanel = replacePanel;
  public showPlaceholderUntil = showPlaceholderUntil;
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
    return this.getState().componentState.expandedPanelId;
  };

  public setExpandedPanelId = (newId?: string) => {
    this.dispatch.setExpandedPanelId(newId);
  };

  public openOverlay = (ref: OverlayRef) => {
    this.clearOverlays();
    this.overlayRef = ref;
  };

  public clearOverlays = () => {
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
}
