/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { Subscription } from 'rxjs';
import uuid from 'uuid';
import { CoreStart, IUiSettingsClient, KibanaExecutionContext } from '@kbn/core/public';
import { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';

import { ControlGroupContainer } from '@kbn/controls-plugin/public';
import { Filter, TimeRange } from '@kbn/es-query';
import { DataView } from '@kbn/data-views-plugin/public';

import { UiActionsStart } from '../../services/ui_actions';
import { RefreshInterval, Query } from '../../services/data';
import {
  ViewMode,
  Container,
  PanelState,
  IEmbeddable,
  EmbeddableInput,
  EmbeddableStart,
  EmbeddableOutput,
  EmbeddableFactory,
  ErrorEmbeddable,
  isErrorEmbeddable,
} from '../../services/embeddable';
import { DASHBOARD_CONTAINER_TYPE } from './dashboard_constants';
import { createPanelState } from './panel';
import { DashboardPanelState } from './types';
import { DashboardViewport } from './viewport/dashboard_viewport';
import {
  KibanaContextProvider,
  KibanaReactContext,
  KibanaReactContextValue,
  KibanaThemeProvider,
} from '../../services/kibana_react';
import { PLACEHOLDER_EMBEDDABLE } from './placeholder';
import { DASHBOARD_LOADED_EVENT } from '../../events';
import { DashboardAppCapabilities, DashboardContainerInput } from '../../types';
import { PresentationUtilPluginStart } from '../../services/presentation_util';
import type { ScreenshotModePluginStart } from '../../services/screenshot_mode';
import { PanelPlacementMethod, IPanelPlacementArgs } from './panel/dashboard_panel_placement';
import {
  combineDashboardFiltersWithControlGroupFilters,
  syncDashboardControlGroup,
} from '../lib/dashboard_control_group';

export interface DashboardContainerServices {
  ExitFullScreenButton: React.ComponentType<any>;
  presentationUtil: PresentationUtilPluginStart;
  SavedObjectFinder: React.ComponentType<any>;
  notifications: CoreStart['notifications'];
  application: CoreStart['application'];
  inspector: InspectorStartContract;
  overlays: CoreStart['overlays'];
  screenshotMode: ScreenshotModePluginStart;
  uiSettings: IUiSettingsClient;
  embeddable: EmbeddableStart;
  uiActions: UiActionsStart;
  theme: CoreStart['theme'];
  http: CoreStart['http'];
  analytics?: CoreStart['analytics'];
}

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

export type DashboardReactContextValue = KibanaReactContextValue<DashboardContainerServices>;
export type DashboardReactContext = KibanaReactContext<DashboardContainerServices>;

const defaultCapabilities: DashboardAppCapabilities = {
  show: false,
  createNew: false,
  saveQuery: false,
  createShortUrl: false,
  showWriteControls: false,
  mapsCapabilities: { save: false },
  visualizeCapabilities: { save: false },
  storeSearchSession: true,
};

export class DashboardContainer extends Container<InheritedChildInput, DashboardContainerInput> {
  public readonly type = DASHBOARD_CONTAINER_TYPE;

  private onDestroyControlGroup?: () => void;
  private subscriptions: Subscription = new Subscription();

  public controlGroup?: ControlGroupContainer;
  private domNode?: HTMLElement;

  private allDataViews: DataView[] = [];

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
    private readonly services: DashboardContainerServices,
    parent?: Container,
    controlGroup?: ControlGroupContainer | ErrorEmbeddable
  ) {
    super(
      {
        dashboardCapabilities: defaultCapabilities,
        ...initialInput,
      },
      { embeddableLoaded: {} },
      services.embeddable.getEmbeddableFactory,
      parent
    );

    if (
      controlGroup &&
      !isErrorEmbeddable(controlGroup) &&
      services.presentationUtil.labsService.isProjectEnabled('labs:dashboard:dashboardControls')
    ) {
      this.controlGroup = controlGroup;
      syncDashboardControlGroup({ dashboardContainer: this, controlGroup: this.controlGroup }).then(
        (result) => {
          if (!result) return;
          const { onDestroyControlGroup } = result;
          this.onDestroyControlGroup = onDestroyControlGroup;
        }
      );
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
    if (this.services.analytics) {
      reportPerformanceMetricEvent(this.services.analytics, {
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
    const controlsEnabled = this.services.presentationUtil.labsService.isProjectEnabled(
      'labs:dashboard:dashboardControls'
    );
    ReactDOM.render(
      <I18nProvider>
        <KibanaContextProvider services={this.services}>
          <KibanaThemeProvider theme$={this.services.theme.theme$}>
            <this.services.presentationUtil.ContextProvider>
              <DashboardViewport
                controlsEnabled={controlsEnabled}
                container={this}
                controlGroup={this.controlGroup}
                onDataLoaded={this.onDataLoaded.bind(this)}
              />
            </this.services.presentationUtil.ContextProvider>
          </KibanaThemeProvider>
        </KibanaContextProvider>
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
