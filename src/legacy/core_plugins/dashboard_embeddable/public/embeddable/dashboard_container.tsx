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
import { IndexPattern } from 'ui/index_patterns';

import {
  Container,
  ContainerInput,
  EmbeddableFactoryRegistry,
  EmbeddableInput,
  Filter,
  Query,
  RefreshConfig,
  ViewMode,
  isErrorEmbeddable,
  EmbeddableFactory,
  IEmbeddable,
  TimeRange,
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
  panels: { [panelId: string]: DashboardPanelState<any> };

  // Used to force a refresh of embeddables even if there were no other input state
  // changes.
  lastReloadRequestTime?: number;
}

export interface InheritedChildInput {
  filters: Filter[];
  query: Query;
  timeRange: TimeRange;
  refreshConfig?: RefreshConfig;
  viewMode: ViewMode;
  hidePanelTitles?: boolean;
  id: string;
}

export class DashboardContainer extends Container<InheritedChildInput, DashboardContainerInput> {
  public readonly type = DASHBOARD_CONTAINER_TYPE;

  constructor(
    initialInput: DashboardContainerInput,
    embeddableFactories: EmbeddableFactoryRegistry,
    parent?: Container
  ) {
    super(
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

  protected createNewPanelState<
    TEmbeddableInput extends EmbeddableInput,
    TEmbeddable extends IEmbeddable<TEmbeddableInput, any>
  >(
    factory: EmbeddableFactory<TEmbeddableInput, any, TEmbeddable>,
    partial: Partial<TEmbeddableInput> = {}
  ): DashboardPanelState<TEmbeddableInput> {
    const panelState = super.createNewPanelState(factory, partial);
    return createPanelState(panelState, Object.values(this.input.panels));
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

  public render(dom: HTMLElement) {
    ReactDOM.render(
      // @ts-ignore - hitting https://github.com/DefinitelyTyped/DefinitelyTyped/issues/27805
      <I18nProvider>
        <DashboardViewport container={this} />
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

  protected getInheritedInput(id: string): InheritedChildInput {
    const { viewMode, refreshConfig, timeRange, query, hidePanelTitles, filters } = this.input;
    return {
      filters,
      hidePanelTitles,
      query,
      timeRange: {
        // Somewhere along the way this is modified directly, we need to make a copy so everything
        // updates correctly.
        ...timeRange,
      },
      refreshConfig,
      viewMode,
      id,
    };
  }
}
