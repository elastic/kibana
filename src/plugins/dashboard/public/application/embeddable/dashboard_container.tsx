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

import { I18nProvider } from '@kbn/i18n-react';
import { Subscription } from 'rxjs';
import type { KibanaExecutionContext } from '@kbn/core/public';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import type { ControlGroupContainer } from '@kbn/controls-plugin/public';
import type { Filter, TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  ViewMode,
  Container,
  type PanelState,
  type IEmbeddable,
  type EmbeddableInput,
  type EmbeddableOutput,
  type EmbeddableFactory,
  ErrorEmbeddable,
  isErrorEmbeddable,
} from '@kbn/embeddable-plugin/public';
import type { Query } from '@kbn/es-query';
import type { RefreshInterval } from '@kbn/data-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

import { DASHBOARD_CONTAINER_TYPE } from '../../dashboard_constants';
import { createPanelState } from './panel';
import { DashboardPanelState } from './types';
import { DashboardViewport } from './viewport/dashboard_viewport';
import { PLACEHOLDER_EMBEDDABLE } from './placeholder';
import { DASHBOARD_LOADED_EVENT } from '../../events';
import { DashboardContainerInput } from '../../types';
import { PanelPlacementMethod, IPanelPlacementArgs } from './panel/dashboard_panel_placement';
import {
  combineDashboardFiltersWithControlGroupFilters,
  syncDashboardControlGroup,
} from '../lib/dashboard_control_group';
import { pluginServices } from '../../services/plugin_services';

export interface DashboardLoadedInfo {
  timeToData: number;
  timeToDone: number;
  numOfPanels: number;
  status: string;
}

interface IndexSignature {
  [key: string]: unknown;
}

export interface InheritedChildInput extends IndexSignature {
  filters: Filter[];
  query: Query;
  timeRange: TimeRange;
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

  private onDestroyControlGroup?: () => void;
  private subscriptions: Subscription = new Subscription();

  public controlGroup?: ControlGroupContainer;
  private domNode?: HTMLElement;

  private allDataViews: DataView[] = [];

  /** Services that are used in the Dashboard container code */
  private analyticsService;
  private theme$;

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

  constructor(
    initialInput: DashboardContainerInput,
    parent?: Container,
    controlGroup?: ControlGroupContainer | ErrorEmbeddable
  ) {
    const {
      embeddable: { getEmbeddableFactory },
      settings: { isProjectEnabledInLabs },
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
    } = pluginServices.getServices());

    if (
      controlGroup &&
      !isErrorEmbeddable(controlGroup) &&
      isProjectEnabledInLabs('labs:dashboard:dashboardControls')
    ) {
      this.controlGroup = controlGroup;
      syncDashboardControlGroup({
        dashboardContainer: this,
        controlGroup: this.controlGroup,
      }).then((result) => {
        if (!result) return;
        const { onDestroyControlGroup } = result;
        this.onDestroyControlGroup = onDestroyControlGroup;
      });
    }

    this.subscriptions.add(
      this.getAnyChildOutputChange$().subscribe(() => {
        if (!this.controlGroup) {
          return;
        }

        for (const child of Object.values(this.children)) {
          const isLoading = child.getOutput().loading;
          if (isLoading) {
            this.controlGroup.anyControlOutputConsumerLoading$.next(true);
            return;
          }
        }
        this.controlGroup.anyControlOutputConsumerLoading$.next(false);
      })
    );
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

  public render(dom: HTMLElement) {
    if (this.domNode) {
      ReactDOM.unmountComponentAtNode(this.domNode);
    }
    this.domNode = dom;

    ReactDOM.render(
      <I18nProvider>
        <KibanaThemeProvider theme$={this.theme$}>
          <DashboardViewport
            container={this}
            controlGroup={this.controlGroup}
            onDataLoaded={this.onDataLoaded.bind(this)}
          />
        </KibanaThemeProvider>
      </I18nProvider>,
      dom
    );
  }

  public destroy() {
    super.destroy();
    this.subscriptions.unsubscribe();
    this.onDestroyControlGroup?.();
    if (this.domNode) ReactDOM.unmountComponentAtNode(this.domNode);
  }

  protected getInheritedInput(id: string): InheritedChildInput {
    const {
      viewMode,
      refreshConfig,
      timeRange,
      timeslice,
      query,
      hidePanelTitles,
      filters,
      searchSessionId,
      syncColors,
      syncTooltips,
      executionContext,
    } = this.input;

    let combinedFilters = filters;
    if (this.controlGroup) {
      combinedFilters = combineDashboardFiltersWithControlGroupFilters(filters, this.controlGroup);
    }
    return {
      filters: combinedFilters,
      hidePanelTitles,
      query,
      timeRange,
      timeslice,
      refreshConfig,
      viewMode,
      id,
      searchSessionId,
      syncColors,
      syncTooltips,
      executionContext,
    };
  }
}
