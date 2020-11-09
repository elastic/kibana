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

import { i18n } from '@kbn/i18n';
import { Action } from 'src/plugins/ui_actions/public';
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
