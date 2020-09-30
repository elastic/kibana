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
import _ from 'lodash';
import uuid from 'uuid';
import { ActionByType, IncompatibleActionError } from '../../ui_actions_plugin';
import { ViewMode, PanelState, IEmbeddable } from '../../embeddable_plugin';
import {
  PanelNotFoundError,
  EmbeddableInput,
  isReferenceOrValueEmbeddable,
} from '../../../../embeddable/public';
import { DashboardPanelState, DASHBOARD_CONTAINER_TYPE, DashboardContainer } from '..';

export const ACTION_UNLINK_FROM_LIBRARY = 'unlinkFromLibrary';

export interface UnlinkFromLibraryActionContext {
  embeddable: IEmbeddable;
}

export class UnlinkFromLibraryAction implements ActionByType<typeof ACTION_UNLINK_FROM_LIBRARY> {
  public readonly type = ACTION_UNLINK_FROM_LIBRARY;
  public readonly id = ACTION_UNLINK_FROM_LIBRARY;
  public order = 15;

  constructor() {}

  public getDisplayName({ embeddable }: UnlinkFromLibraryActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return i18n.translate('dashboard.panel.unlinkFromLibrary', {
      defaultMessage: 'Unlink from library item',
    });
  }

  public getIconType({ embeddable }: UnlinkFromLibraryActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return 'folderExclamation';
  }

  public async isCompatible({ embeddable }: UnlinkFromLibraryActionContext) {
    return Boolean(
      embeddable.getInput()?.viewMode !== ViewMode.VIEW &&
        embeddable.getRoot() &&
        embeddable.getRoot().isContainer &&
        embeddable.getRoot().type === DASHBOARD_CONTAINER_TYPE &&
        isReferenceOrValueEmbeddable(embeddable) &&
        embeddable.inputIsRefType(embeddable.getInput())
    );
  }

  public async execute({ embeddable }: UnlinkFromLibraryActionContext) {
    if (!isReferenceOrValueEmbeddable(embeddable)) {
      throw new IncompatibleActionError();
    }

    const newInput = await embeddable.getInputAsValueType();
    embeddable.updateInput(newInput);

    const dashboard = embeddable.getRoot() as DashboardContainer;
    const panelToReplace = dashboard.getInput().panels[embeddable.id] as DashboardPanelState;
    if (!panelToReplace) {
      throw new PanelNotFoundError();
    }

    const newPanel: PanelState<EmbeddableInput> = {
      type: embeddable.type,
      explicitInput: { ...newInput, id: uuid.v4() },
    };
    dashboard.replacePanel(panelToReplace, newPanel);
  }
}
