/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { RefreshInterval, TimeRange, Query, Filter } from 'src/plugins/data/public';
import { CoreStart } from 'src/core/public';
import { Start as InspectorStartContract } from 'src/plugins/inspector/public';
import uuid from 'uuid';
import { UiActionsStart } from '../../ui_actions_plugin';
import {
  Container,
  ContainerInput,
  EmbeddableInput,
  ViewMode,
  EmbeddableFactory,
  IEmbeddable,
  EmbeddableStart,
  PanelState,
} from '../../embeddable_plugin';
import { DASHBOARD_CONTAINER_TYPE } from './dashboard_constants';
import { createPanelState } from './panel';
import { DashboardPanelState } from './types';
import { DashboardViewport } from './viewport/dashboard_viewport';
import {
  KibanaContextProvider,
  KibanaReactContext,
  KibanaReactContextValue,
} from '../../../../kibana_react/public';
import { PLACEHOLDER_EMBEDDABLE } from './placeholder';
import { PanelPlacementMethod, IPanelPlacementArgs } from './panel/dashboard_panel_placement';
import { EmbeddableStateTransfer, EmbeddableOutput } from '../../../../embeddable/public';

export interface DashboardContainerInput extends ContainerInput {
  viewMode: ViewMode;
  filters: Filter[];
  query: Query;
  timeRange: TimeRange;
  refreshConfig?: RefreshInterval;
  expandedPanelId?: string;
  useMargins: boolean;
  title: string;
  description?: string;
  isEmbeddedExternally?: boolean;
  isFullScreenMode: boolean;
  panels: {
    [panelId: string]: DashboardPanelState<EmbeddableInput & { [k: string]: unknown }>;
  };
  isEmptyState?: boolean;
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
}

export interface DashboardContainerOptions {
  application: CoreStart['application'];
  overlays: CoreStart['overlays'];
  notifications: CoreStart['notifications'];
  embeddable: EmbeddableStart;
  inspector: InspectorStartContract;
  SavedObjectFinder: React.ComponentType<any>;
  ExitFullScreenButton: React.ComponentType<any>;
  uiActions: UiActionsStart;
}

export type DashboardReactContextValue = KibanaReactContextValue<DashboardContainerOptions>;
export type DashboardReactContext = KibanaReactContext<DashboardContainerOptions>;

export class DashboardContainer extends Container<InheritedChildInput, DashboardContainerInput> {
  public readonly type = DASHBOARD_CONTAINER_TYPE;

  public renderEmpty?: undefined | (() => React.ReactNode);

  private embeddablePanel: EmbeddableStart['EmbeddablePanel'];

  constructor(
    initialInput: DashboardContainerInput,
    private readonly options: DashboardContainerOptions,
    stateTransfer?: EmbeddableStateTransfer,
    parent?: Container
  ) {
    super(
      {
        ...initialInput,
      },
      { embeddableLoaded: {} },
      options.embeddable.getEmbeddableFactory,
      parent
    );
    this.embeddablePanel = options.embeddable.getEmbeddablePanel(stateTransfer);
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
    newStateComplete.then((newPanelState: Partial<PanelState>) =>
      this.replacePanel(placeholderPanelState, newPanelState)
    );
  }

  public replacePanel(
    previousPanelState: DashboardPanelState<EmbeddableInput>,
    newPanelState: Partial<PanelState>
  ) {
    // TODO: In the current infrastructure, embeddables in a container do not react properly to
    // changes. Removing the existing embeddable, and adding a new one is a temporary workaround
    // until the container logic is fixed.
    const finalPanels = { ...this.input.panels };
    delete finalPanels[previousPanelState.explicitInput.id];
    const newPanelId = newPanelState.explicitInput?.id ? newPanelState.explicitInput.id : uuid.v4();
    finalPanels[newPanelId] = {
      ...previousPanelState,
      ...newPanelState,
      gridData: {
        ...previousPanelState.gridData,
        i: newPanelId,
      },
      explicitInput: {
        ...newPanelState.explicitInput,
        id: newPanelId,
      },
    };
    this.updateInput({
      panels: finalPanels,
      lastReloadRequestTime: new Date().getTime(),
    });
  }

  public async addOrUpdateEmbeddable<
    EEI extends EmbeddableInput = EmbeddableInput,
    EEO extends EmbeddableOutput = EmbeddableOutput,
    E extends IEmbeddable<EEI, EEO> = IEmbeddable<EEI, EEO>
  >(type: string, explicitInput: Partial<EEI>) {
    if (explicitInput.id && this.input.panels[explicitInput.id]) {
      this.replacePanel(this.input.panels[explicitInput.id], {
        type,
        explicitInput: {
          ...explicitInput,
          id: uuid.v4(),
        },
      });
    } else {
      this.addNewEmbeddable<EEI, EEO, E>(type, explicitInput);
    }
  }

  public render(dom: HTMLElement) {
    ReactDOM.render(
      <I18nProvider>
        <KibanaContextProvider services={this.options}>
          <DashboardViewport
            renderEmpty={this.renderEmpty}
            container={this}
            PanelComponent={this.embeddablePanel}
          />
        </KibanaContextProvider>
      </I18nProvider>,
      dom
    );
  }

  protected getInheritedInput(id: string): InheritedChildInput {
    const { viewMode, refreshConfig, timeRange, query, hidePanelTitles, filters } = this.input;
    return {
      filters,
      hidePanelTitles,
      query,
      timeRange,
      refreshConfig,
      viewMode,
      id,
    };
  }
}
