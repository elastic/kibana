/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { omit } from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import {
  BehaviorSubject,
  Subject,
  Subscription,
  distinctUntilChanged,
  first,
  map,
  skipWhile,
  switchMap,
} from 'rxjs';
import { v4 } from 'uuid';

import { METRIC_TYPE } from '@kbn/analytics';
import type { Reference } from '@kbn/content-management-utils';
import { ControlGroupApi } from '@kbn/controls-plugin/public';
import type { KibanaExecutionContext, OverlayRef } from '@kbn/core/public';
import { RefreshInterval } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  Container,
  DefaultEmbeddableApi,
  EmbeddableFactoryNotFoundError,
  PanelNotFoundError,
  ViewMode,
  embeddableInputToSubject,
  isExplicitInputWithAttributes,
  type EmbeddableFactory,
  type EmbeddableInput,
  type EmbeddableOutput,
  type IEmbeddable,
} from '@kbn/embeddable-plugin/public';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import {
  HasRuntimeChildState,
  HasSaveNotification,
  HasSerializedChildState,
  PanelPackage,
  TrackContentfulRender,
  TracksQueryPerformance,
  combineCompatibleChildrenApis,
} from '@kbn/presentation-containers';
import { PublishesSettings } from '@kbn/presentation-containers/interfaces/publishes_settings';
import { apiHasSerializableState } from '@kbn/presentation-containers/interfaces/serialized_state';
import {
  PublishesDataLoading,
  PublishesViewMode,
  apiPublishesDataLoading,
  apiPublishesPanelTitle,
  apiPublishesUnsavedChanges,
  getPanelTitle,
  type PublishingSubject,
} from '@kbn/presentation-publishing';
import { ReduxEmbeddableTools, ReduxToolsPackage } from '@kbn/presentation-util-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { ExitFullScreenButtonKibanaProvider } from '@kbn/shared-ux-button-exit-full-screen';

import { DASHBOARD_CONTAINER_TYPE, DashboardApi, DashboardLocatorParams } from '../..';
import type { DashboardAttributes } from '../../../server/content_management';
import { DashboardContainerInput, DashboardPanelMap, DashboardPanelState } from '../../../common';
import {
  getReferencesForControls,
  getReferencesForPanelId,
} from '../../../common/dashboard_container/persistable_state/dashboard_container_references';
import { DashboardContext } from '../../dashboard_api/use_dashboard_api';
import { getPanelAddedSuccessString } from '../../dashboard_app/_dashboard_app_strings';
import {
  DASHBOARD_APP_ID,
  DASHBOARD_UI_METRIC_ID,
  DEFAULT_PANEL_HEIGHT,
  DEFAULT_PANEL_WIDTH,
  PanelPlacementStrategy,
} from '../../dashboard_constants';
import { PANELS_CONTROL_GROUP_KEY } from '../../services/dashboard_backup_service';
import { getDashboardContentManagementService } from '../../services/dashboard_content_management_service';
import {
  coreServices,
  dataService,
  embeddableService,
  usageCollectionService,
} from '../../services/kibana_services';
import { getDashboardCapabilities } from '../../utils/get_dashboard_capabilities';
import { DashboardViewport } from '../component/viewport/dashboard_viewport';
import { placePanel } from '../panel_placement';
import { getDashboardPanelPlacementSetting } from '../panel_placement/panel_placement_registry';
import { runPanelPlacementStrategy } from '../panel_placement/place_new_panel_strategies';
import { dashboardContainerReducers } from '../state/dashboard_container_reducers';
import { getDiffingMiddleware } from '../state/diffing/dashboard_diffing_integration';
import { DashboardReduxState, DashboardStateFromSettingsFlyout, UnsavedPanelState } from '../types';
import { addFromLibrary, addOrUpdateEmbeddable, runInteractiveSave, runQuickSave } from './api';
import { duplicateDashboardPanel } from './api/duplicate_dashboard_panel';
import {
  combineDashboardFiltersWithControlGroupFilters,
  startSyncingDashboardControlGroup,
} from './create/controls/dashboard_control_group_integration';
import { initializeDashboard } from './create/create_dashboard';
import {
  dashboardTypeDisplayLowercase,
  dashboardTypeDisplayName,
} from './dashboard_container_factory';
import { InitialComponentState, getDashboardApi } from '../../dashboard_api/get_dashboard_api';
import type { DashboardCreationOptions } from '../..';
import { ShowSourceFlyout } from '../component/showsource/show_source_flyout';

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

export class DashboardContainer
  extends Container<InheritedChildInput, DashboardContainerInput>
  implements
    TrackContentfulRender,
    TracksQueryPerformance,
    HasSaveNotification,
    HasRuntimeChildState,
    HasSerializedChildState,
    PublishesSettings,
    Partial<PublishesViewMode>
{
  public readonly type = DASHBOARD_CONTAINER_TYPE;

  // state management
  public select: DashboardReduxEmbeddableTools['select'];
  public getState: DashboardReduxEmbeddableTools['getState'];
  public dispatch: DashboardReduxEmbeddableTools['dispatch'];
  public onStateChange: DashboardReduxEmbeddableTools['onStateChange'];
  public anyReducerRun: Subject<null> = new Subject();
  public setAnimatePanelTransforms: (animate: boolean) => void;
  public setManaged: (managed: boolean) => void;
  public setHasUnsavedChanges: (hasUnsavedChanges: boolean) => void;
  public openOverlay: (ref: OverlayRef, options?: { focusedPanelId?: string }) => void;
  public clearOverlays: () => void;
  public highlightPanel: (panelRef: HTMLDivElement) => void;
  public setScrollToPanelId: (id: string | undefined) => void;
  public setFullScreenMode: (fullScreenMode: boolean) => void;
  public setExpandedPanelId: (newId?: string) => void;
  public setHighlightPanelId: (highlightPanelId: string | undefined) => void;
  public setLastSavedInput: (lastSavedInput: DashboardContainerInput) => void;
  public lastSavedInput$: PublishingSubject<DashboardContainerInput>;
  public setSavedObjectId: (id: string | undefined) => void;
  public expandPanel: (panelId: string) => void;
  public scrollToPanel: (panelRef: HTMLDivElement) => Promise<void>;
  public scrollToTop: () => void;

  public integrationSubscriptions: Subscription = new Subscription();
  public publishingSubscription: Subscription = new Subscription();
  public diffingSubscription: Subscription = new Subscription();
  public controlGroupApi$: PublishingSubject<ControlGroupApi | undefined>;
  public settings: Record<string, PublishingSubject<boolean | undefined>>;

  public searchSessionId?: string;
  public lastReloadRequestTime$ = new BehaviorSubject<string | undefined>(undefined);
  public searchSessionId$ = new BehaviorSubject<string | undefined>(undefined);
  public reload$ = new Subject<void>();
  public timeRestore$: BehaviorSubject<boolean | undefined>;
  public timeslice$: BehaviorSubject<[number, number] | undefined>;
  public unifiedSearchFilters$?: PublishingSubject<Filter[] | undefined>;
  public locator?: Pick<LocatorPublic<DashboardLocatorParams>, 'navigate' | 'getRedirectUrl'>;

  public readonly executionContext: KibanaExecutionContext;

  private domNode?: HTMLElement;

  // performance monitoring
  public lastLoadStartTime?: number;
  public creationStartTime?: number;
  public creationEndTime?: number;
  public firstLoad: boolean = true;
  private hadContentfulRender = false;

  // setup
  public untilContainerInitialized: () => Promise<void>;

  // cleanup
  public stopSyncingWithUnifiedSearch?: () => void;
  private cleanupStateTools: () => void;

  // Services that are used in the Dashboard container code
  private creationOptions?: DashboardCreationOptions;
  private showWriteControls: boolean;

  public trackContentfulRender() {
    if (!this.hadContentfulRender) {
      coreServices.analytics.reportEvent('dashboard_loaded_with_data', {});
    }
    this.hadContentfulRender = true;
  }

  private trackPanelAddMetric:
    | ((type: string, eventNames: string | string[], count?: number | undefined) => void)
    | undefined;
  // new embeddable framework
  public savedObjectReferences: Reference[] = [];
  public controlGroupInput: DashboardAttributes['controlGroupInput'] | undefined;

  constructor(
    initialInput: DashboardContainerInput,
    reduxToolsPackage: ReduxToolsPackage,
    initialSessionId?: string,
    dashboardCreationStartTime?: number,
    parent?: Container,
    creationOptions?: DashboardCreationOptions,
    initialComponentState?: InitialComponentState
  ) {
    const controlGroupApi$ = new BehaviorSubject<ControlGroupApi | undefined>(undefined);
    async function untilContainerInitialized(): Promise<void> {
      return new Promise((resolve) => {
        controlGroupApi$
          .pipe(
            skipWhile((controlGroupApi) => !controlGroupApi),
            switchMap(async (controlGroupApi) => {
              // Bug in main where panels are loaded before control filters are ready
              // Want to migrate to react embeddable controls with same behavior
              // TODO - do not load panels until control filters are ready
              /*
                await controlGroupApi?.untilInitialized();
              */
            }),
            first()
          )
          .subscribe(() => {
            resolve();
          });
      });
    }

    super(
      {
        ...initialInput,
      },
      { embeddableLoaded: {} },
      embeddableService.getEmbeddableFactory,
      parent,
      { untilContainerInitialized }
    );

    ({ showWriteControls: this.showWriteControls } = getDashboardCapabilities());

    this.controlGroupApi$ = controlGroupApi$;
    this.untilContainerInitialized = untilContainerInitialized;

    this.trackPanelAddMetric = usageCollectionService?.reportUiCounter.bind(
      usageCollectionService,
      DASHBOARD_UI_METRIC_ID
    );

    this.creationOptions = creationOptions;
    this.searchSessionId = initialSessionId;
    this.searchSessionId$.next(initialSessionId);
    this.creationStartTime = dashboardCreationStartTime;

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
    });
    this.onStateChange = reduxTools.onStateChange;
    this.cleanupStateTools = reduxTools.cleanup;
    this.getState = reduxTools.getState;
    this.dispatch = reduxTools.dispatch;
    this.select = reduxTools.select;

    this.uuid$ = embeddableInputToSubject<string>(
      this.publishingSubscription,
      this,
      'id'
    ) as BehaviorSubject<string>;

    const dashboardApi = getDashboardApi(
      initialComponentState
        ? initialComponentState
        : {
            anyMigrationRun: false,
            isEmbeddedExternally: false,
            lastSavedInput: initialInput,
            lastSavedId: undefined,
            fullScreenMode: false,
            managed: false,
          },
      (id: string) => this.untilEmbeddableLoaded(id)
    );
    this.animatePanelTransforms$ = dashboardApi.animatePanelTransforms$;
    this.fullScreenMode$ = dashboardApi.fullScreenMode$;
    this.hasUnsavedChanges$ = dashboardApi.hasUnsavedChanges$;
    this.isEmbeddedExternally = dashboardApi.isEmbeddedExternally;
    this.managed$ = dashboardApi.managed$;
    this.setAnimatePanelTransforms = dashboardApi.setAnimatePanelTransforms;
    this.setFullScreenMode = dashboardApi.setFullScreenMode;
    this.setHasUnsavedChanges = dashboardApi.setHasUnsavedChanges;
    this.setManaged = dashboardApi.setManaged;
    this.expandedPanelId = dashboardApi.expandedPanelId;
    this.focusedPanelId$ = dashboardApi.focusedPanelId$;
    this.highlightPanelId$ = dashboardApi.highlightPanelId$;
    this.highlightPanel = dashboardApi.highlightPanel;
    this.setExpandedPanelId = dashboardApi.setExpandedPanelId;
    this.setHighlightPanelId = dashboardApi.setHighlightPanelId;
    this.scrollToPanelId$ = dashboardApi.scrollToPanelId$;
    this.setScrollToPanelId = dashboardApi.setScrollToPanelId;
    this.clearOverlays = dashboardApi.clearOverlays;
    this.hasOverlays$ = dashboardApi.hasOverlays$;
    this.openOverlay = dashboardApi.openOverlay;
    this.hasRunMigrations$ = dashboardApi.hasRunMigrations$;
    this.setLastSavedInput = dashboardApi.setLastSavedInput;
    this.lastSavedInput$ = dashboardApi.lastSavedInput$;
    this.savedObjectId = dashboardApi.savedObjectId;
    this.setSavedObjectId = dashboardApi.setSavedObjectId;
    this.expandPanel = dashboardApi.expandPanel;
    this.scrollToPanel = dashboardApi.scrollToPanel;
    this.scrollToTop = dashboardApi.scrollToTop;

    this.useMargins$ = new BehaviorSubject(this.getState().explicitInput.useMargins);
    this.panels$ = new BehaviorSubject(this.getState().explicitInput.panels);
    this.publishingSubscription.add(
      this.onStateChange(() => {
        const state = this.getState();
        if (this.useMargins$.value !== state.explicitInput.useMargins) {
          this.useMargins$.next(state.explicitInput.useMargins);
        }
        if (this.panels$.value !== state.explicitInput.panels) {
          this.panels$.next(state.explicitInput.panels);
        }
      })
    );

    this.startAuditingReactEmbeddableChildren();

    this.settings = {
      syncColors$: embeddableInputToSubject<boolean | undefined, DashboardContainerInput>(
        this.publishingSubscription,
        this,
        'syncColors'
      ),
      syncCursor$: embeddableInputToSubject<boolean | undefined, DashboardContainerInput>(
        this.publishingSubscription,
        this,
        'syncCursor'
      ),
      syncTooltips$: embeddableInputToSubject<boolean | undefined, DashboardContainerInput>(
        this.publishingSubscription,
        this,
        'syncTooltips'
      ),
    };
    this.timeRestore$ = embeddableInputToSubject<boolean | undefined, DashboardContainerInput>(
      this.publishingSubscription,
      this,
      'timeRestore'
    );
    this.timeslice$ = embeddableInputToSubject<
      [number, number] | undefined,
      DashboardContainerInput
    >(this.publishingSubscription, this, 'timeslice');
    this.lastReloadRequestTime$ = embeddableInputToSubject<
      string | undefined,
      DashboardContainerInput
    >(this.publishingSubscription, this, 'lastReloadRequestTime');

    startSyncingDashboardControlGroup(this);

    this.executionContext = initialInput.executionContext;

    this.dataLoading = new BehaviorSubject<boolean | undefined>(false);
    this.publishingSubscription.add(
      combineCompatibleChildrenApis<PublishesDataLoading, boolean | undefined>(
        this,
        'dataLoading',
        apiPublishesDataLoading,
        undefined,
        // flatten method
        (values) => {
          return values.some((isLoading) => isLoading);
        }
      ).subscribe((isAtLeastOneChildLoading) => {
        (this.dataLoading as BehaviorSubject<boolean | undefined>).next(isAtLeastOneChildLoading);
      })
    );

    this.dataViews = new BehaviorSubject<DataView[] | undefined>([]);

    const query$ = new BehaviorSubject<Query | AggregateQuery | undefined>(this.getInput().query);
    this.query$ = query$;
    this.publishingSubscription.add(
      this.getInput$().subscribe((input) => {
        if (!deepEqual(query$.getValue() ?? [], input.query)) {
          query$.next(input.query);
        }
      })
    );
  }

  public setControlGroupApi(controlGroupApi: ControlGroupApi) {
    (this.controlGroupApi$ as BehaviorSubject<ControlGroupApi | undefined>).next(controlGroupApi);
  }

  public getAppContext() {
    const embeddableAppContext = this.creationOptions?.getEmbeddableAppContext?.(
      this.savedObjectId.value
    );
    return {
      ...embeddableAppContext,
      currentAppId: embeddableAppContext?.currentAppId ?? DASHBOARD_APP_ID,
    };
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
      <KibanaRenderContextProvider
        analytics={coreServices.analytics}
        i18n={coreServices.i18n}
        theme={coreServices.theme}
      >
        <ExitFullScreenButtonKibanaProvider
          coreStart={{ chrome: coreServices.chrome, customBranding: coreServices.customBranding }}
        >
          <DashboardContext.Provider value={this as DashboardApi}>
            <DashboardViewport dashboardContainer={this.domNode} />
          </DashboardContext.Provider>
        </ExitFullScreenButtonKibanaProvider>
      </KibanaRenderContextProvider>,
      dom
    );
  }

  public updateInput(changes: Partial<DashboardContainerInput>): void {
    // block the Dashboard from entering edit mode if this Dashboard is managed.
    if (
      (this.managed$.value || !this.showWriteControls) &&
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
      syncCursor,
      hidePanelTitles,
      refreshInterval,
      executionContext,
      panels,
    } = this.input;

    const combinedFilters = combineDashboardFiltersWithControlGroupFilters(
      filters,
      this.controlGroupApi$?.value
    );
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
      syncCursor,
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
    this.diffingSubscription.unsubscribe();
    this.publishingSubscription.unsubscribe();
    this.integrationSubscriptions.unsubscribe();
    this.stopSyncingWithUnifiedSearch?.();
    if (this.domNode) ReactDOM.unmountComponentAtNode(this.domNode);
  }

  // ------------------------------------------------------------------------------------------------------
  // Dashboard API
  // ------------------------------------------------------------------------------------------------------
  public runInteractiveSave = runInteractiveSave;
  public runQuickSave = runQuickSave;

  public addFromLibrary = addFromLibrary;

  public duplicatePanel(id: string) {
    duplicateDashboardPanel.bind(this)(id);
  }

  public canRemovePanels = () => this.expandedPanelId.value === undefined;

  public getTypeDisplayName = () => dashboardTypeDisplayName;
  public getTypeDisplayNameLowerCase = () => dashboardTypeDisplayLowercase;

  public savedObjectId: BehaviorSubject<string | undefined>;
  public expandedPanelId: BehaviorSubject<string | undefined>;
  public focusedPanelId$: BehaviorSubject<string | undefined>;
  public managed$: BehaviorSubject<boolean>;
  public fullScreenMode$: BehaviorSubject<boolean>;
  public hasRunMigrations$: BehaviorSubject<boolean>;
  public hasUnsavedChanges$: BehaviorSubject<boolean>;
  public hasOverlays$: BehaviorSubject<boolean>;
  public useMargins$: BehaviorSubject<boolean>;
  public scrollToPanelId$: BehaviorSubject<string | undefined>;
  public highlightPanelId$: BehaviorSubject<string | undefined>;
  public animatePanelTransforms$: BehaviorSubject<boolean>;
  public panels$: BehaviorSubject<DashboardPanelMap>;
  public isEmbeddedExternally: boolean;
  public uuid$: BehaviorSubject<string>;

  public async replacePanel(idToRemove: string, { panelType, initialState }: PanelPackage) {
    const newId = await this.replaceEmbeddable(
      idToRemove,
      initialState as Partial<EmbeddableInput>,
      panelType,
      true
    );
    if (this.expandedPanelId.value !== undefined) {
      this.setExpandedPanelId(newId);
    }
    this.setHighlightPanelId(newId);
    return newId;
  }

  public async addNewPanel<ApiType extends unknown = unknown>(
    panelPackage: PanelPackage,
    displaySuccessMessage?: boolean
  ) {
    const onSuccess = (id?: string, title?: string) => {
      if (!displaySuccessMessage) return;
      coreServices.notifications.toasts.addSuccess({
        title: getPanelAddedSuccessString(title),
        'data-test-subj': 'addEmbeddableToDashboardSuccess',
      });
      this.setScrollToPanelId(id);
      this.setHighlightPanelId(id);
    };

    if (this.trackPanelAddMetric) {
      this.trackPanelAddMetric(METRIC_TYPE.CLICK, panelPackage.panelType);
    }
    if (embeddableService.reactEmbeddableRegistryHasKey(panelPackage.panelType)) {
      const newId = v4();

      const getCustomPlacementSettingFunc = getDashboardPanelPlacementSetting(
        panelPackage.panelType
      );

      const customPlacementSettings = getCustomPlacementSettingFunc
        ? await getCustomPlacementSettingFunc(panelPackage.initialState)
        : {};

      const placementSettings = {
        width: DEFAULT_PANEL_WIDTH,
        height: DEFAULT_PANEL_HEIGHT,
        strategy: PanelPlacementStrategy.findTopLeftMostOpenSpace,
        ...customPlacementSettings,
      };

      const { width, height, strategy } = placementSettings;

      const { newPanelPlacement, otherPanels } = runPanelPlacementStrategy(strategy, {
        currentPanels: this.getInput().panels,
        height,
        width,
      });
      const newPanel: DashboardPanelState = {
        type: panelPackage.panelType,
        gridData: {
          ...newPanelPlacement,
          i: newId,
        },
        explicitInput: {
          id: newId,
        },
      };
      if (panelPackage.initialState) {
        this.setRuntimeStateForChild(newId, panelPackage.initialState);
      }
      this.updateInput({ panels: { ...otherPanels, [newId]: newPanel } });
      onSuccess(newId, newPanel.explicitInput.title);
      return await this.untilReactEmbeddableLoaded<ApiType>(newId);
    }

    const embeddableFactory = embeddableService.getEmbeddableFactory(panelPackage.panelType);
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
    if (embeddableService.reactEmbeddableRegistryHasKey(panel.type)) {
      const child = this.children$.value[panelId];
      if (!child) throw new PanelNotFoundError();
      const serialized = apiHasSerializableState(child)
        ? await child.serializeState()
        : { rawState: {} };
      return {
        type: panel.type,
        explicitInput: { ...panel.explicitInput, ...serialized.rawState },
        gridData: panel.gridData,
        references: serialized.references,
      };
    }
    return panel;
  };

  public addOrUpdateEmbeddable = addOrUpdateEmbeddable;

  public forceRefresh(refreshControlGroup: boolean = true) {
    this.dispatch.setLastReloadRequestTimeToNow({});
    if (refreshControlGroup) {
      // only reload all panels if this refresh does not come from the control group.
      this.reload$.next();
    }
  }

  public async asyncResetToLastSavedState() {
    this.dispatch.resetToLastSavedInput(this.lastSavedInput$.value);
    const {
      explicitInput: { timeRange, refreshInterval },
    } = this.getState();

    const { timeRestore: lastSavedTimeRestore } = this.lastSavedInput$.value;

    if (this.controlGroupApi$.value) {
      await this.controlGroupApi$.value.asyncResetUnsavedChanges();
    }

    // if we are using the unified search integration, we need to force reset the time picker.
    if (this.creationOptions?.useUnifiedSearchIntegration && lastSavedTimeRestore) {
      const timeFilterService = dataService.query.timefilter.timefilter;
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

    if (newCreationOptions) {
      this.creationOptions = { ...this.creationOptions, ...newCreationOptions };
    }
    const loadDashboardReturn = await getDashboardContentManagementService().loadDashboardState({
      id: newSavedObjectId,
    });

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
      untilDashboardReady,
      loadDashboardReturn,
    });
    if (!initializeResult) return;
    const { input: newInput, searchSessionId } = initializeResult;

    this.searchSessionId = searchSessionId;
    this.searchSessionId$.next(searchSessionId);

    this.setAnimatePanelTransforms(false); // prevents panels from animating on navigate.
    this.setManaged(loadDashboardReturn?.managed ?? false);
    this.setExpandedPanelId(undefined);
    this.setLastSavedInput(omit(loadDashboardReturn?.dashboardInput, 'controlGroupInput'));
    this.setSavedObjectId(newSavedObjectId);
    this.firstLoad = true;
    this.updateInput(newInput);
    dashboardContainerReady$.next(this);
  };

  /**
   * Use this to set the dataviews that are used in the dashboard when they change/update
   * @param newDataViews The new array of dataviews that will overwrite the old dataviews array
   */
  public setAllDataViews = (newDataViews: DataView[]) => {
    (this.dataViews as BehaviorSubject<DataView[] | undefined>).next(newDataViews);
  };

  public getPanelsState = () => {
    return this.getState().explicitInput.panels;
  };

  public getSettings = (): DashboardStateFromSettingsFlyout => {
    const state = this.getState();
    return {
      description: state.explicitInput.description,
      hidePanelTitles: state.explicitInput.hidePanelTitles,
      syncColors: state.explicitInput.syncColors,
      syncCursor: state.explicitInput.syncCursor,
      syncTooltips: state.explicitInput.syncTooltips,
      tags: state.explicitInput.tags,
      timeRestore: state.explicitInput.timeRestore,
      title: state.explicitInput.title,
      useMargins: state.explicitInput.useMargins,
    };
  };

  public setSettings = (settings: DashboardStateFromSettingsFlyout) => {
    this.dispatch.setStateFromSettingsFlyout(settings);
  };

  public setViewMode = (viewMode: ViewMode) => {
    // block the Dashboard from entering edit mode if this Dashboard is managed.
    if (this.managed$.value && viewMode?.toLowerCase() === ViewMode.EDIT) {
      return;
    }
    this.dispatch.setViewMode(viewMode);
  };

  public setQuery = (query?: Query | undefined) => this.updateInput({ query });

  public setFilters = (filters?: Filter[] | undefined) => this.updateInput({ filters });

  public setTags = (tags: string[]) => {
    this.updateInput({ tags });
  };

  public getPanelCount = () => {
    return Object.keys(this.getInput().panels).length;
  };

  public async getPanelTitles(): Promise<string[]> {
    const titles: string[] = [];
    for (const [id, panel] of Object.entries(this.getInput().panels)) {
      const title = await (async () => {
        if (embeddableService.reactEmbeddableRegistryHasKey(panel.type)) {
          const child = this.children$.value[id];
          return apiPublishesPanelTitle(child) ? getPanelTitle(child) : '';
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

  public setPanels = (panels: DashboardPanelMap) => {
    this.dispatch.setPanels(panels);
  };

  // ------------------------------------------------------------------------------------------------------
  // React Embeddable system
  // ------------------------------------------------------------------------------------------------------
  public registerChildApi = (api: DefaultEmbeddableApi) => {
    this.children$.next({
      ...this.children$.value,
      [api.uuid]: api as DefaultEmbeddableApi,
    });
  };

  public saveNotification$: Subject<void> = new Subject<void>();

  public getSerializedStateForChild = (childId: string) => {
    const rawState = this.getInput().panels[childId].explicitInput;
    const { id, ...serializedState } = rawState;
    if (!rawState || Object.keys(serializedState).length === 0) return;
    const references = getReferencesForPanelId(childId, this.savedObjectReferences);
    return {
      rawState,
      // references from old installations may not be prefixed with panel id
      // fall back to passing all references in these cases to preserve backwards compatability
      references: references.length > 0 ? references : this.savedObjectReferences,
    };
  };

  public getSerializedStateForControlGroup = () => {
    return {
      rawState: this.controlGroupInput
        ? this.controlGroupInput
        : {
            labelPosition: 'oneLine',
            chainingSystem: 'HIERARCHICAL',
            autoApplySelections: true,
            controls: [],
            ignoreParentSettings: {
              ignoreFilters: false,
              ignoreQuery: false,
              ignoreTimerange: false,
              ignoreValidations: false,
            },
          },
      references: getReferencesForControls(this.savedObjectReferences),
    };
  };

  private restoredRuntimeState: UnsavedPanelState | undefined = undefined;
  public setRuntimeStateForChild = (childId: string, state: object) => {
    const runtimeState = this.restoredRuntimeState ?? {};
    runtimeState[childId] = state;
    this.restoredRuntimeState = runtimeState;
  };
  public getRuntimeStateForChild = (childId: string) => {
    return this.restoredRuntimeState?.[childId];
  };

  public getRuntimeStateForControlGroup = () => {
    return this.getRuntimeStateForChild(PANELS_CONTROL_GROUP_KEY);
  };

  public removePanel(id: string) {
    const type = this.getInput().panels[id]?.type;
    this.removeEmbeddable(id);
    if (embeddableService.reactEmbeddableRegistryHasKey(type)) {
      const { [id]: childToRemove, ...otherChildren } = this.children$.value;
      this.children$.next(otherChildren);
    }
  }

  public startAuditingReactEmbeddableChildren = () => {
    const auditChildren = () => {
      const currentChildren = this.children$.value;
      let panelsChanged = false;
      for (const panelId of Object.keys(currentChildren)) {
        if (!this.getInput().panels[panelId]) {
          delete currentChildren[panelId];
          panelsChanged = true;
        }
      }
      if (panelsChanged) this.children$.next(currentChildren);
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
    this.restoredRuntimeState = undefined;
    let resetChangedPanelCount = false;
    const currentChildren = this.children$.value;
    for (const panelId of Object.keys(currentChildren)) {
      if (this.getInput().panels[panelId]) {
        const child = currentChildren[panelId];
        if (apiPublishesUnsavedChanges(child)) child.resetUnsavedChanges();
      } else {
        // if reset resulted in panel removal, we need to update the list of children
        delete currentChildren[panelId];
        resetChangedPanelCount = true;
      }
    }
    if (resetChangedPanelCount) this.children$.next(currentChildren);
  };

  public showSource() {
    alert('All the code below is broken.');

    return;

    const {
      analytics,
      settings: { i18n, theme },
      overlays,
    } = pluginServices.getServices();

    console.log('dashboard', this);

    this.openOverlay(
      overlays.openFlyout(
        toMountPoint(
          <DashboardContainerContext.Provider value={this}>
            <ShowSourceFlyout
              onClose={() => {
                this.clearOverlays();
              }}
            />
          </DashboardContainerContext.Provider>,
          { analytics, i18n, theme }
        ),
        {
          size: 'm',
          'data-test-subj': 'dashboardShowSourceFlyout',
          onClose: (flyout) => {
            this.clearOverlays();
            flyout.close();
          },
        }
      )
    );
  }
}
