/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import type { ApplicationStart } from '@kbn/core/public';
import {
  type EmbeddableApiContext,
  apiCanAccessViewMode,
  apiHasAppContext,
  apiIsOfType,
  apiIsPresentationContainer,
  getInheritedViewMode,
} from '@kbn/presentation-publishing';

import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { ADD_PANEL_VISUALIZATION_GROUP, type EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { getAllEsqlControls } from '@kbn/esql-utils';
import type { ControlPanelsState } from '@kbn/control-group-renderer';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import type { DiscoverAppLocator } from '../../../common';
import { ACTION_ADD_DISCOVER_SESSION_PANEL } from '../constants';
import type { DiscoverSessionByValueInput } from '../../plugin_imports/embeddable_editor_service';

export class AddDiscoverSessionPanelAction implements Action<EmbeddableApiContext> {
  public id = ACTION_ADD_DISCOVER_SESSION_PANEL;
  public readonly type = ACTION_ADD_DISCOVER_SESSION_PANEL;
  public readonly order = 45;
  public readonly grouping = [ADD_PANEL_VISUALIZATION_GROUP];

  constructor(
    private readonly application: ApplicationStart,
    private readonly locator: DiscoverAppLocator,
    private readonly embeddable: EmbeddableStart
  ) {}

  getIconType(): string | undefined {
    return 'discoverApp';
  }

  getDisplayName(): string {
    return i18n.translate('discover.savedSearchEmbeddable.action.addPanel.displayName', {
      defaultMessage: 'Discover session',
    });
  }

  async execute({
    embeddable: embeddableApi,
  }: ActionExecutionContext<EmbeddableApiContext>): Promise<void> {
    const { app, path } = await this.locator.getLocation({});
    const stateTransfer = this.embeddable.getStateTransfer();

    const discoverSessionTab: DiscoverSessionTab = {
      id: uuidv4(),
      label: i18n.translate('discover.savedSearchEmbeddable.action.addPanel.byValueTabName', {
        defaultMessage: 'New Discover session',
      }),
      sort: [],
      columns: [],
      isTextBasedQuery: true,
      grid: {},
      hideChart: false,
      hideTable: false,
      serializedSearchSource: {},
    };
    const valueInput: DiscoverSessionByValueInput = {
      discoverSessionTab,
      dashboardControlGroupState: apiIsPresentationContainer(embeddableApi)
        ? (getAllEsqlControls(embeddableApi) as ControlPanelsState<OptionsListESQLControlState>)
        : undefined,
    };

    const appContext = apiHasAppContext(embeddableApi) ? embeddableApi.getAppContext() : undefined;

    stateTransfer.navigateToEditor(app, {
      path,
      state: {
        valueInput,
        originatingApp: appContext?.currentAppId || '',
        originatingPath: appContext?.getCurrentPath?.(),
      },
    });
  }

  getDisplayNameTooltip(): string {
    return '';
  }

  async isCompatible({ embeddable }: ActionExecutionContext<EmbeddableApiContext>) {
    const { capabilities } = this.application;
    const hasDiscoverPermissions =
      (capabilities.discover_v2.show as boolean) || (capabilities.discover_v2.save as boolean);

    if (!hasDiscoverPermissions) return false;

    return (
      apiCanAccessViewMode(embeddable) &&
      getInheritedViewMode(embeddable) === 'edit' &&
      apiIsOfType(embeddable, 'dashboard')
    );
  }
}
