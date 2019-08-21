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
import { Action, ActionContext } from '../../../../actions';
import { ViewMode } from '../../../../types';

const CUSTOMIZE_PANEL_ACTION_ID = 'CUSTOMIZE_PANEL_ACTION_ID';

type GetUserData = (context: ActionContext) => Promise<{ title: string | undefined }>;

export class CustomizePanelTitleAction extends Action {
  public readonly type = CUSTOMIZE_PANEL_ACTION_ID;

  constructor(private readonly getDataFromUser: GetUserData) {
    super(CUSTOMIZE_PANEL_ACTION_ID);
    this.order = 10;
  }

  public getDisplayName() {
    return i18n.translate('embeddableApi.customizePanel.action.displayName', {
      defaultMessage: 'Customize panel',
    });
  }

  public getIconType() {
    return 'pencil';
  }

  public async isCompatible({ embeddable }: ActionContext) {
    return embeddable.getInput().viewMode === ViewMode.EDIT ? true : false;
  }

  public async execute({ embeddable }: ActionContext) {
    const customTitle = await this.getDataFromUser({ embeddable });
    embeddable.updateInput(customTitle);
  }
}
