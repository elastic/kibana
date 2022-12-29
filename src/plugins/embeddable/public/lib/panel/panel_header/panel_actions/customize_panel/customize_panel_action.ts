/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Action } from '@kbn/ui-actions-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { ViewMode } from '../../../../types';
import { IEmbeddable, Embeddable, EmbeddableInput } from '../../../..';

export const ACTION_CUSTOMIZE_PANEL = 'ACTION_CUSTOMIZE_PANEL';

type GetUserData = (context: CustomPanelActionContext) => Promise<{
  title: string | undefined;
  description?: string | undefined;
  hideTitle?: boolean;
  timeRange?: TimeRange;
}>;

export interface TimeRangeInput extends EmbeddableInput {
  timeRange: TimeRange;
}

export interface CustomPanelActionContext {
  embeddable: IEmbeddable | Embeddable<TimeRangeInput>;
}

export class CustomizePanelAction implements Action<CustomPanelActionContext> {
  public readonly type = ACTION_CUSTOMIZE_PANEL;
  public id = ACTION_CUSTOMIZE_PANEL;
  public order = 40;

  constructor(private readonly getDataFromUser: GetUserData) {}

  public getDisplayName() {
    return i18n.translate('embeddableApi.customizePanel.action.displayName', {
      defaultMessage: 'Edit panel settings',
    });
  }

  public getIconType() {
    return 'pencil';
  }

  public async isCompatible({ embeddable }: CustomPanelActionContext) {
    return embeddable.getInput().viewMode === ViewMode.EDIT ? true : false;
  }

  public async execute({ embeddable }: CustomPanelActionContext) {
    const {
      title,
      description,
      hideTitle: hidePanelTitles,
      timeRange,
    } = await this.getDataFromUser({ embeddable });
    embeddable.updateInput({ title, description, hidePanelTitles, timeRange });
  }
}
