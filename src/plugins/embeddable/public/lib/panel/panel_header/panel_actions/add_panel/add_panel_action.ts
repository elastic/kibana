/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { NotificationsStart, OverlayStart, ThemeServiceStart } from '@kbn/core/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { EmbeddableStart } from '../../../../../plugin';
import { ViewMode } from '../../../../types';
import { openAddPanelFlyout } from './open_add_panel_flyout';
import { IContainer } from '../../../../containers';

export const ACTION_ADD_PANEL = 'ACTION_ADD_PANEL';

interface ActionContext {
  embeddable: IContainer;
}

export class AddPanelAction implements Action<ActionContext> {
  public readonly type = ACTION_ADD_PANEL;
  public readonly id = ACTION_ADD_PANEL;

  constructor(
    private readonly getFactory: EmbeddableStart['getEmbeddableFactory'],
    private readonly getAllFactories: EmbeddableStart['getEmbeddableFactories'],
    private readonly overlays: OverlayStart,
    private readonly notifications: NotificationsStart,
    private readonly SavedObjectFinder: React.ComponentType<any>,
    private readonly theme: ThemeServiceStart,
    private readonly reportUiCounter?: UsageCollectionStart['reportUiCounter']
  ) {}

  public getDisplayName() {
    return i18n.translate('embeddableApi.addPanel.displayName', {
      defaultMessage: 'Add panel',
    });
  }

  public getIconType() {
    return 'plusInCircleFilled';
  }

  public async isCompatible(context: ActionExecutionContext<ActionContext>) {
    const { embeddable } = context;
    return embeddable.getIsContainer() && embeddable.getInput().viewMode === ViewMode.EDIT;
  }

  public async execute(context: ActionExecutionContext<ActionContext>) {
    const { embeddable } = context;
    if (!embeddable.getIsContainer() || !(await this.isCompatible(context))) {
      throw new Error('Context is incompatible');
    }

    openAddPanelFlyout({
      embeddable,
      getFactory: this.getFactory,
      getAllFactories: this.getAllFactories,
      overlays: this.overlays,
      notifications: this.notifications,
      SavedObjectFinder: this.SavedObjectFinder,
      reportUiCounter: this.reportUiCounter,
      theme: this.theme,
    });
  }
}
