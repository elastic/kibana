/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { I18nProvider } from '@kbn/i18n/react';
import React from 'react';
import ReactDOM from 'react-dom';
import uuid from 'uuid';
import type { CoreStart } from '../../../../../core/public';
import type { IUiSettingsClient } from '../../../../../core/public/ui_settings/types';
import type { KibanaExecutionContext } from '../../../../../core/types/execution_context';
import type { Filter } from '../../../../data/common/es_query';
import type { RefreshInterval, TimeRange } from '../../../../data/common/query/timefilter/types';
import type { EmbeddableInput, PanelState } from '../../../../embeddable/common/types';
import { ViewMode } from '../../../../embeddable/common/types';
import { Container } from '../../../../embeddable/public/lib/containers/container';
import type { EmbeddableFactory } from '../../../../embeddable/public/lib/embeddables/embeddable_factory';
import type {
  EmbeddableOutput,
  IEmbeddable,
} from '../../../../embeddable/public/lib/embeddables/i_embeddable';
import type { EmbeddableStart } from '../../../../embeddable/public/plugin';
import type { Start as InspectorStartContract } from '../../../../inspector/public/plugin';
import { KibanaContextProvider } from '../../../../kibana_react/public/context/context';
import type {
  KibanaReactContext,
  KibanaReactContextValue,
} from '../../../../kibana_react/public/context/types';
import type { PresentationUtilPluginStart } from '../../../../presentation_util/public/types';
import type { UiActionsStart } from '../../../../ui_actions/public/plugin';
import type { DashboardPanelState } from '../../../common/types';
import type { Query } from '../../services/data';
import type { DashboardAppCapabilities, DashboardContainerInput } from '../../types';
import { DASHBOARD_CONTAINER_TYPE } from './dashboard_constants';
import { createPanelState } from './panel/create_panel_state';
import type { IPanelPlacementArgs, PanelPlacementMethod } from './panel/dashboard_panel_placement';
import { PLACEHOLDER_EMBEDDABLE } from './placeholder/placeholder_embeddable';
import { DashboardViewport } from './viewport/dashboard_viewport';

export interface DashboardContainerServices {
  ExitFullScreenButton: React.ComponentType<any>;
  presentationUtil: PresentationUtilPluginStart;
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
    ReactDOM.render(
      <I18nProvider>
        <KibanaContextProvider services={this.services}>
          <this.services.presentationUtil.ContextProvider>
            <DashboardViewport container={this} />
          </this.services.presentationUtil.ContextProvider>
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
      executionContext,
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
      executionContext,
    };
  }
}
