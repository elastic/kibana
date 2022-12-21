/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Action } from '@kbn/ui-actions-plugin/public';
import { ViewMode } from '../../../../types';
import { IEmbeddable } from '../../../../embeddables';

export const ACTION_CUSTOMIZE_PANEL = 'ACTION_CUSTOMIZE_PANEL';

type GetUserData = (
  context: ActionContext
) => Promise<{ title: string | undefined; hideTitle?: boolean }>;

interface ActionContext {
  embeddable: IEmbeddable;
}

export class CustomizePanelTitleAction implements Action<ActionContext> {
  public readonly type = ACTION_CUSTOMIZE_PANEL;
  public id = ACTION_CUSTOMIZE_PANEL;
  public order = 40;

  constructor(private readonly getDataFromUser: GetUserData) {}

  public getDisplayName() {
    return i18n.translate('embeddableApi.customizePanel.action.displayName', {
      defaultMessage: 'Edit panel title',
    });
  }

  public getIconType() {
    return 'pencil';
  }

  public async isCompatible({ embeddable }: ActionContext) {
    return embeddable.getInput().viewMode === ViewMode.EDIT ? true : false;
  }

  public async execute({ embeddable }: ActionContext) {
    const data = await this.getDataFromUser({ embeddable });
    const { title, hideTitle } = data;
    embeddable.updateInput({ title, hidePanelTitles: hideTitle });
  }
}
