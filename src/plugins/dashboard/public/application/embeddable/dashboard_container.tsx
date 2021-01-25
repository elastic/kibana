/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import uuid from 'uuid';
import { CoreStart, IUiSettingsClient } from 'src/core/public';
import { Start as InspectorStartContract } from 'src/plugins/inspector/public';

import { UiActionsStart } from '../../services/ui_actions';
import { RefreshInterval, TimeRange, Query, Filter } from '../../services/data';
import {
  ViewMode,
  Container,
  PanelState,
  IEmbeddable,
  ContainerInput,
  EmbeddableInput,
  EmbeddableStart,
  EmbeddableOutput,
  EmbeddableFactory,
} from '../../services/embeddable';
import { DASHBOARD_CONTAINER_TYPE } from './dashboard_constants';
import { createPanelState } from './panel';
import { DashboardPanelState } from './types';
import { DashboardViewport } from './viewport/dashboard_viewport';
import {
  KibanaContextProvider,
  KibanaReactContext,
  KibanaReactContextValue,
} from '../../services/kibana_react';
import { PLACEHOLDER_EMBEDDABLE } from './placeholder';
import { PanelPlacementMethod, IPanelPlacementArgs } from './panel/dashboard_panel_placement';
import { DashboardCapabilities } from '../types';

export interface DashboardContainerInput extends ContainerInput {
  dashboardCapabilities?: DashboardCapabilities;
  refreshConfig?: RefreshInterval;
  isEmbeddedExternally?: boolean;
  isFullScreenMode: boolean;
  expandedPanelId?: string;
  timeRange: TimeRange;
  description?: string;
  useMargins: boolean;
  syncColors?: boolean;
  viewMode: ViewMode;
  filters: Filter[];
  title: string;
  query: Query;
  panels: {
    [panelId: string]: DashboardPanelState<EmbeddableInput & { [k: string]: unknown }>;
  };
}
export interface DashboardContainerServices {
  ExitFullScreenButton: React.ComponentType<any>;
  SavedObjectFinder: React.ComponentType<any>;
  notifications: CoreStart['notifications'];
  application: CoreStart['application'];
  inspector: InspectorStartContract;
  overlays: CoreStart['overlays'];
  uiSettings: IUiSettingsClient;
  embeddable: EmbeddableStart;
  uiActions: UiActionsStart;
  http: CoreStart['http'];
}

interface IndexSignature {
  [key: string]: unknown;
}

export interface InheritedChildInput extends IndexSignature {
  filters: Filter[];
  query: Query;
  timeRange: TimeRange;
  refreshConfig?: RefreshInterval;
  viewMode: ViewMode;
  hidePanelTitles?: boolean;
  id: string;
  searchSessionId?: string;
  syncColors?: boolean;
}

export type DashboardReactContextValue = KibanaReactContextValue<DashboardContainerServices>;
export type DashboardReactContext = KibanaReactContext<DashboardContainerServices>;

const defaultCapabilities = {
  show: false,
  createNew: false,
  saveQuery: false,
  createShortUrl: false,
  hideWriteControls: true,
  mapsCapabilities: { save: false },
  visualizeCapabilities: { save: false },
};

export class DashboardContainer extends Container<InheritedChildInput, DashboardContainerInput> {
  public readonly type = DASHBOARD_CONTAINER_TYPE;
  public switchViewMode?: (newViewMode: ViewMode) => void;

  public getPanelCount = () => {
    return Object.keys(this.getInput().panels).length;
  };

  constructor(
    initialInput: DashboardContainerInput,
    private readonly services: DashboardContainerServices,
    parent?: Container
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
  }

  protected createNewPanelState<
    TEmbeddableInput extends EmbeddableInput,
    TEmbeddable extends IEmbeddable<TEmbeddableInput, any>
  >(
    factory: EmbeddableFactory<TEmbeddableInput, any, TEmbeddable>,
    partial: Partial<TEmbeddableInput> = {}
  ): DashboardPanelState<TEmbeddableInput> {
    const panelState = super.createNewPanelState(factory, partial);
    return createPanelState(panelState, this.input.panels);
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
    const placeholderPanelState = createPanelState(
      originalPanelState,
      this.input.panels,
      placementMethod,
      placementArgs
    );

    this.updateInput({
      panels: {
        ...this.input.panels,
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
    ReactDOM.render(
      <I18nProvider>
        <KibanaContextProvider services={this.services}>
          <DashboardViewport container={this} switchViewMode={this.switchViewMode} />
        </KibanaContextProvider>
      </I18nProvider>,
      dom
    );
  }

  protected getInheritedInput(id: string): InheritedChildInput {
    const {
      viewMode,
      refreshConfig,
      timeRange,
      query,
      hidePanelTitles,
      filters,
      searchSessionId,
      syncColors,
    } = this.input;
    return {
      filters,
      hidePanelTitles,
      query,
      timeRange,
      refreshConfig,
      viewMode,
      id,
      searchSessionId,
      syncColors,
    };
  }
}
