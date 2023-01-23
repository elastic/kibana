/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import ReactDOM from 'react-dom';
import React, { createContext } from 'react';
import { createSelectorHook } from 'react-redux';
import { debounceTime, Observable, Subject, Subscription, switchMap } from 'rxjs';

import { ReduxEmbeddablePackage, ReduxEmbeddableTools } from '@kbn/presentation-util-plugin/public';
import {
  ViewMode,
  Container,
  type IEmbeddable,
  type EmbeddableInput,
  type EmbeddableOutput,
  type EmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { AnyAction, Middleware } from '@reduxjs/toolkit';
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
  getUnsavedChanges,
  startSyncingDashboardDataViews,
  keysNotConsideredUnsavedChanges,
  backupUnsavedChanges,
  reducersToIgnore,
  updateUnsavedChangesState,
  combineDashboardFiltersWithControlGroupFilters,
} from './integrations';
import { DASHBOARD_CONTAINER_TYPE } from '../..';
import { createPanelState } from '../component/panel';
import { pluginServices } from '../../services/plugin_services';
import {
  CHANGE_CHECK_DEBOUNCE,
  DASHBOARD_LOADED_EVENT,
  DEFAULT_DASHBOARD_INPUT,
} from '../../dashboard_constants';
import { DashboardReduxState } from '../types';
import { DashboardCreationOptions } from './dashboard_container_factory';
import { DashboardAnalyticsService } from '../../services/analytics/types';
import { DashboardViewport } from '../component/viewport/dashboard_viewport';
import { DashboardPanelState, DashboardContainerInput } from '../../../common';
import { dashboardContainerReducers } from '../state/dashboard_container_reducers';

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

type SelectorFunction = <Selected extends unknown>(
  selector: (state: DashboardReduxState) => Selected,
  equalityFn?: ((previous: Selected, next: Selected) => boolean) | undefined
) => Selected;

export class DashboardContainer extends Container<InheritedChildInput, DashboardContainerInput> {
  public readonly type = DASHBOARD_CONTAINER_TYPE;
  public controlGroup?: ControlGroupContainer;

  public select: SelectorFunction;

  // Dashboard State
  private onDestroyControlGroup?: () => void;
  private subscriptions: Subscription = new Subscription();

  public reduxEmbeddableTools: ReduxEmbeddableTools<
    DashboardReduxState,
    typeof dashboardContainerReducers
  >;

  private domNode?: HTMLElement;
  private overlayRef?: OverlayRef;
  private allDataViews: DataView[] = [];

  // Services that are used in the Dashboard container code
  private creationOptions?: DashboardCreationOptions;
  private analyticsService: DashboardAnalyticsService;
  private theme$;
  private chrome;

  constructor(
    initialInput: DashboardContainerInput,
    reduxEmbeddablePackage: ReduxEmbeddablePackage,
    initialLastSavedInput?: DashboardContainerInput,
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
    } = pluginServices.getServices());

    this.creationOptions = creationOptions;
    const diffingMiddleware = this.startCheckingForUnsavedChanges();

    // set up data views integration
    this.subscriptions.add(startSyncingDashboardDataViews.bind(this)());

    // build redux embeddable tools
    this.reduxEmbeddableTools = reduxEmbeddablePackage.createTools<
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

    this.select = createSelectorHook(
      createContext({
        store: this.reduxEmbeddableTools.store,
        storeState: this.reduxEmbeddableTools.store.getState(),
      })
    );
  }

  public getDashboardSavedObjectId() {
    return this.reduxEmbeddableTools.getState().componentState.lastSavedId;
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

  private startCheckingForUnsavedChanges() {
    const checkForUnsavedChangesSubject$ = new Subject<null>();
    this.subscriptions.add(
      checkForUnsavedChangesSubject$
        .pipe(
          debounceTime(CHANGE_CHECK_DEBOUNCE),
          switchMap(() => {
            return new Observable((observer) => {
              const {
                explicitInput: currentInput,
                componentState: { lastSavedInput },
              } = this.reduxEmbeddableTools.getState();
              getUnsavedChanges
                .bind(this)(lastSavedInput, currentInput)
                .then((unsavedChanges) => {
                  if (observer.closed) return;

                  updateUnsavedChangesState.bind(this)(unsavedChanges);
                  if (this.creationOptions?.useSessionStorageIntegration) {
                    backupUnsavedChanges.bind(this)(unsavedChanges);
                  }
                });
            });
          })
        )
        .subscribe()
    );
    const diffingMiddleware: Middleware<AnyAction> = (store) => (next) => (action) => {
      const dispatchedActionName = action.type.split('/')?.[1];
      if (
        dispatchedActionName &&
        dispatchedActionName !== 'updateEmbeddableReduxOutput' && // ignore any generic output updates.
        !reducersToIgnore.includes(dispatchedActionName)
      ) {
        checkForUnsavedChangesSubject$.next(null);
      }
      next(action);
    };
    return diffingMiddleware;
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

  public async getExplicitInputIsEqual(lastExplicitInput: DashboardContainerInput) {
    const currentInput = this.reduxEmbeddableTools.getState().explicitInput;
    return (
      omit(
        Object.keys(await getUnsavedChanges.bind(this)(lastExplicitInput, currentInput)),
        keysNotConsideredUnsavedChanges
      ).length > 0
    );
  }

  public render(dom: HTMLElement) {
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
    } = this.input;

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
    } = this.reduxEmbeddableTools;
    dispatch(setLastReloadRequestTimeToNow({}));
    this.controlGroup?.reload();
  }

  public onDataViewsUpdate$ = new Subject<DataView[]>();

  public resetToLastSavedState() {
    const {
      dispatch,
      getState,
      actions: { resetToLastSavedInput },
    } = this.reduxEmbeddableTools;
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
