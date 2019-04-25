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
import uuid from 'uuid';

import { I18nProvider } from '@kbn/i18n/react';
import { IndexPattern } from 'ui/index_patterns';

import { TimeRange } from 'ui/timefilter/time_history';
import {
  Container,
  ContainerInput,
  Embeddable,
  EmbeddableFactoryRegistry,
  EmbeddableInput,
  Filter,
  Query,
  RefreshConfig,
  ViewMode,
  EmbeddableOutput,
  EmbeddableInputMissingFromContainer,
  isErrorEmbeddable,
  EmbeddableFactory,
} from '../../../embeddable_api/public/index';

import { DASHBOARD_CONTAINER_TYPE } from './dashboard_container_factory';
import { createPanelState } from './panel';
import { DashboardPanelState } from './types';
import { DashboardViewport } from './viewport/dashboard_viewport';

export interface DashboardContainerInput extends ContainerInput {
  viewMode: ViewMode;
  filters: Filter[];
  query: Query;
  timeRange: TimeRange;
  refreshConfig?: RefreshConfig;
  expandedPanelId?: string;
  useMargins: boolean;
  title: string;
  description?: string;
  isFullScreenMode: boolean;
  panels: { [panelId: string]: DashboardPanelState };

  // Used to force a refresh of embeddables even if there were no other input state
  // changes.
  lastReloadRequestTime?: number;
}

export interface DashboardEmbeddableInput {
  filters: Filter[];
  query: Query;
  timeRange: TimeRange;
  refreshConfig?: RefreshConfig;
  viewMode: ViewMode;
  hidePanelTitles?: boolean;
  id: string;
  firstName: string;
}

export interface DashboardEmbeddableOutput extends EmbeddableOutput {
  indexPatterns?: IndexPattern[];
}

export type DashboardEmbeddable = Embeddable<
  DashboardEmbeddableInput & EmbeddableInput,
  DashboardEmbeddableOutput
>;

export class DashboardContainer extends Container<
  DashboardEmbeddableInput,
  DashboardEmbeddableOutput,
  DashboardContainerInput
> {
  constructor(
    initialInput: DashboardContainerInput,
    embeddableFactories: EmbeddableFactoryRegistry,
    parent?: Container
  ) {
    super(
      DASHBOARD_CONTAINER_TYPE,
      {
        panels: {},
        isFullScreenMode: false,
        filters: [],
        useMargins: true,
        ...initialInput,
      },
      { embeddableLoaded: {} },
      embeddableFactories,
      parent
    );
  }

  protected createNewPanelState<EEI extends EmbeddableInput = EmbeddableInput>(
    factory: EmbeddableFactory<EEI>,
    partial: Partial<EmbeddableInputMissingFromContainer<EEI, DashboardEmbeddableInput>> & {
      id?: string;
    } = {}
  ): DashboardPanelState<EmbeddableInputMissingFromContainer<EEI, DashboardEmbeddableInput>> {
    const panelState = super.createNewPanelState(factory, partial);
    return createPanelState<EmbeddableInputMissingFromContainer<EEI, DashboardEmbeddableInput>>(
      panelState,
      Object.values(this.input.panels)
    );
  }

  public onToggleExpandPanel(id: string) {
    const newValue = this.input.expandedPanelId ? undefined : id;
    this.updateInput({
      expandedPanelId: newValue,
    });
  }

  public onPanelsUpdated = (panels: { [panelId: string]: DashboardPanelState }) => {
    this.updateInput({
      panels: {
        ...panels,
      },
    });
  };

  public onExitFullScreenMode = () => {
    this.updateInput({
      isFullScreenMode: false,
    });
  };

  public render(dom: React.ReactNode) {
    ReactDOM.render(
      // @ts-ignore
      <I18nProvider>
        <DashboardViewport embeddableFactories={this.embeddableFactories} container={this} />
      </I18nProvider>,
      dom
    );
  }

  public getPanelIndexPatterns() {
    const indexPatterns: IndexPattern[] = [];
    Object.values(this.children).forEach(embeddable => {
      if (!isErrorEmbeddable(embeddable)) {
        const embeddableIndexPatterns = embeddable.getOutput().indexPatterns;
        if (embeddableIndexPatterns) {
          indexPatterns.push(...embeddableIndexPatterns);
        }
      }
    });
    return indexPatterns;
  }

  protected getInheritedInput(id: string): DashboardEmbeddableInput {
    const { viewMode, refreshConfig, timeRange, query, hidePanelTitles, filters } = this.input;
    return {
      filters,
      hidePanelTitles,
      query,
      timeRange,
      refreshConfig,
      viewMode,
      id,
      firstName: 'suuuue',
    };
  }
}
