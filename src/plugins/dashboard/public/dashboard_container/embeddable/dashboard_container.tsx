/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import uuid from 'uuid';
import ReactDOM from 'react-dom';
import { Subscription } from 'rxjs';

import {
  ViewMode,
  Container,
  type PanelState,
  type IEmbeddable,
  type EmbeddableInput,
  type EmbeddableOutput,
  type EmbeddableFactory,
  ErrorEmbeddable,
} from '@kbn/embeddable-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import type { Filter, TimeRange, Query } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { RefreshInterval } from '@kbn/data-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import type { ControlGroupContainer } from '@kbn/controls-plugin/public';
import {
  lazyLoadReduxEmbeddablePackage,
  ReduxEmbeddableTools,
} from '@kbn/presentation-util-plugin/public';

import { DASHBOARD_CONTAINER_TYPE } from '../..';
import {
  DashboardContainerByValueInput,
  DashboardContainerInput,
  DashboardPanelState,
} from '../../../common';
import { pluginServices } from '../../services/plugin_services';
import { DASHBOARD_LOADED_EVENT } from '../../dashboard_constants';
import { DashboardAnalyticsService } from '../../services/analytics/types';
import { createPanelState } from '../component/panel';
import {
  IPanelPlacementArgs,
  PanelPlacementMethod,
} from '../component/panel/dashboard_panel_placement';
import { PLACEHOLDER_EMBEDDABLE } from '../../placeholder_embeddable';
import { DashboardViewport } from '../component/viewport/dashboard_viewport';
import { DashboardContainerOutput, DashboardReduxState } from '../types';
import { dashboardContainerReducers } from '../state/dashboard_container_reducers';
import { DashboardSavedObjectService } from '../../services/dashboard_saved_object/types';
import { dashboardContainerInputIsByValue } from '../../../common/dashboard_container/type_guards';
import { dashboardStateLoadWasSuccessful } from '../../services/dashboard_saved_object/lib/load_dashboard_state_from_saved_object';

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
  syncTooltips?: boolean;
  executionContext?: KibanaExecutionContext;
}

export class DashboardContainer extends Container<InheritedChildInput, DashboardContainerInput> {
  public readonly type = DASHBOARD_CONTAINER_TYPE;

  // Dashboard State
  private onDestroyControlGroup?: () => void;
  private subscriptions: Subscription = new Subscription();

  private reduxEmbeddableTools?: ReduxEmbeddableTools<
    DashboardReduxState,
    typeof dashboardContainerReducers
  >;

  public controlGroup?: ControlGroupContainer;
  private domNode?: HTMLElement;

  private allDataViews: DataView[] = [];

  // Services that are used in the Dashboard container code
  private analyticsService: DashboardAnalyticsService;
  private dashboardSavedObjectService: DashboardSavedObjectService;
  private theme$;

  constructor(
    initialInput: DashboardContainerInput,
    parent?: Container,
    overrideInput?: Partial<DashboardContainerByValueInput>,
    controlGroup?: ControlGroupContainer | ErrorEmbeddable
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
      dashboardSavedObject: this.dashboardSavedObjectService,
      settings: {
        theme: { theme$: this.theme$ },
      },
    } = pluginServices.getServices());

    this.initializeDashboard(overrideInput);

    // TODO CONTROL GROUP
    // if (
    //   controlGroup &&
    //   !isErrorEmbeddable(controlGroup) &&
    //   isProjectEnabledInLabs('labs:dashboard:dashboardControls')
    // ) {
    //   this.controlGroup = controlGroup;
    //   syncDashboardControlGroup({ dashboardContainer: this, controlGroup: this.controlGroup }).then(
    //     (result) => {
    //       if (!result) return;
    //       const { onDestroyControlGroup } = result;
    //       this.onDestroyControlGroup = onDestroyControlGroup;
    //     }
    //   );
    // }

    // this.subscriptions.add(
    //   this.getAnyChildOutputChange$().subscribe(() => {
    //     if (!this.controlGroup) {
    //       return;
    //     }

    //     for (const child of Object.values(this.children)) {
    //       const isLoading = child.getOutput().loading;
    //       if (isLoading) {
    //         this.controlGroup.anyControlOutputConsumerLoading$.next(true);
    //         return;
    //       }
    //     }
    //     this.controlGroup.anyControlOutputConsumerLoading$.next(false);
    //   })
    // );
  }

  public getInputAsValueType = () => {
    if (!dashboardContainerInputIsByValue(this.input)) {
      throw new Error('cannot get input as value type until after dahsboard input is unwrapped.');
    }
    return this.getInput() as DashboardContainerByValueInput;
  };

  private async unwrapDashboardContainerInput(): Promise<DashboardContainerByValueInput> {
    if (dashboardContainerInputIsByValue(this.input)) {
      return this.input;
    }
    try {
      const unwrapResult = await this.dashboardSavedObjectService.loadDashboardStateFromSavedObject(
        {
          id: this.input.savedObjectId,
        }
      );
      if (dashboardStateLoadWasSuccessful(unwrapResult)) {
        return unwrapResult.dashboardInput;
      }
      throw new Error('Error loading dashboard state');
    } catch (e) {
      this.onFatalError(e);
      return e;
    }
  }

  private async initializeDashboard(overrideInput?: Partial<DashboardContainerByValueInput>) {
    const reduxEmbeddablePackagePromise = lazyLoadReduxEmbeddablePackage();
    const dashboardStateUnwrapPromise = this.unwrapDashboardContainerInput();

    const [reduxEmbeddablePackage, inputFromSavedObject] = await Promise.all([
      reduxEmbeddablePackagePromise,
      dashboardStateUnwrapPromise,
    ]);

    // push by value input to embeddable input
    const initialInput = { ...inputFromSavedObject, ...overrideInput };

    // update input so the redux embeddable tools get the unwrapped, initial input
    this.updateInput(initialInput);

    // build redux embeddable tools
    this.reduxEmbeddableTools = reduxEmbeddablePackage.createTools<
      DashboardReduxState,
      typeof dashboardContainerReducers
    >({
      embeddable: this as IEmbeddable<DashboardContainerByValueInput, DashboardContainerOutput>, // cast to unwrapped state type
      reducers: dashboardContainerReducers,
    });

    // TODO communicate that dashboard is loaded.... dashboard renderer will NOT call render on the container until it is ready.
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

  public render(dom: HTMLElement) {
    if (this.domNode) {
      ReactDOM.unmountComponentAtNode(this.domNode);
    }
    this.domNode = dom;

    const { Wrapper: DashboardReduxWrapper } = this.reduxEmbeddableTools!;
    ReactDOM.render(
      <I18nProvider>
        <KibanaThemeProvider theme$={this.theme$}>
          <DashboardReduxWrapper>
            <DashboardViewport onDataLoaded={this.onDataLoaded.bind(this)} container={this} />
          </DashboardReduxWrapper>
        </KibanaThemeProvider>
      </I18nProvider>,
      dom
    );
  }

  public destroy() {
    super.destroy();
    this.onDestroyControlGroup?.();
    this.subscriptions.unsubscribe();
    this.reduxEmbeddableTools?.cleanup();
    if (this.domNode) ReactDOM.unmountComponentAtNode(this.domNode);
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

    const combinedFilters = filters;

    // TODO Control group
    // if (this.controlGroup) {
    //   combinedFilters = combineDashboardFiltersWithControlGroupFilters(filters, this.controlGroup);
    // }
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
  // Dashboard API
  // ------------------------------------------------------------------------------------------------------

  public getExpandedPanelId = () => {
    if (!this.reduxEmbeddableTools) throw new Error();
    return this.reduxEmbeddableTools.getState().componentState.expandedPanelId;
  };

  public setExpandedPanelId = (newId?: string) => {
    if (!this.reduxEmbeddableTools) throw new Error();
    const {
      actions: { setExpandedPanelId },
      dispatch,
    } = this.reduxEmbeddableTools;
    dispatch(setExpandedPanelId(newId));
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

  public async addOrUpdateEmbeddable<
    EEI extends EmbeddableInput = EmbeddableInput,
    EEO extends EmbeddableOutput = EmbeddableOutput,
    E extends IEmbeddable<EEI, EEO> = IEmbeddable<EEI, EEO>
  >(type: string, explicitInput: Partial<EEI>, embeddableId?: string) {
    const idToReplace = embeddableId || explicitInput.id;
    if (idToReplace && this.input.panels[idToReplace]) {
      return this.replacePanel(this.input.panels[idToReplace], {
        type,
        explicitInput: {
          ...explicitInput,
          id: idToReplace,
        },
      });
    }
    return this.addNewEmbeddable<EEI, EEO, E>(type, explicitInput);
  }

  public replacePanel(
    previousPanelState: DashboardPanelState<EmbeddableInput>,
    newPanelState: Partial<PanelState>,
    generateNewId?: boolean
  ) {
    let panels;
    if (generateNewId) {
      // replace panel can be called with generateNewId in order to totally destroy and recreate the embeddable
      panels = { ...this.input.panels };
      delete panels[previousPanelState.explicitInput.id];
      const newId = uuid.v4();
      panels[newId] = {
        ...previousPanelState,
        ...newPanelState,
        gridData: {
          ...previousPanelState.gridData,
          i: newId,
        },
        explicitInput: {
          ...newPanelState.explicitInput,
          id: newId,
        },
      };
    } else {
      // Because the embeddable type can change, we have to operate at the container level here
      panels = {
        ...this.input.panels,
        [previousPanelState.explicitInput.id]: {
          ...previousPanelState,
          ...newPanelState,
          gridData: {
            ...previousPanelState.gridData,
          },
          explicitInput: {
            ...newPanelState.explicitInput,
            id: previousPanelState.explicitInput.id,
          },
        },
      };
    }

    return this.updateInput({
      panels,
      lastReloadRequestTime: new Date().getTime(),
    });
  }

  public showPlaceholderUntil<TPlacementMethodArgs extends IPanelPlacementArgs>(
    newStateComplete: Promise<Partial<PanelState>>,
    placementMethod?: PanelPlacementMethod<TPlacementMethodArgs>,
    placementArgs?: TPlacementMethodArgs
  ): void {
    const originalPanelState = {
      type: PLACEHOLDER_EMBEDDABLE,
      explicitInput: {
        id: uuid.v4(),
        disabledActions: [
          'ACTION_CUSTOMIZE_PANEL',
          'CUSTOM_TIME_RANGE',
          'clonePanel',
          'replacePanel',
          'togglePanel',
        ],
      },
    } as PanelState<EmbeddableInput>;

    const { otherPanels, newPanel: placeholderPanelState } = createPanelState(
      originalPanelState,
      this.input.panels,
      placementMethod,
      placementArgs
    );

    this.updateInput({
      panels: {
        ...otherPanels,
        [placeholderPanelState.explicitInput.id]: placeholderPanelState,
      },
    });

    // wait until the placeholder is ready, then replace it with new panel
    // this is useful as sometimes panels can load faster than the placeholder one (i.e. by value embeddables)
    this.untilEmbeddableLoaded(originalPanelState.explicitInput.id)
      .then(() => newStateComplete)
      .then((newPanelState: Partial<PanelState>) =>
        this.replacePanel(placeholderPanelState, newPanelState)
      );
  }
}
