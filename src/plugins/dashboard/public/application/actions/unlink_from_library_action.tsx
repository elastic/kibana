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
import { CoreStart, SimpleSavedObject } from 'src/core/public';
import _ from 'lodash';
import uuid from 'uuid';
import { ActionByType, IncompatibleActionError } from '../../ui_actions_plugin';
import { ViewMode, PanelState, IEmbeddable } from '../../embeddable_plugin';
import {
  PanelNotFoundError,
  EmbeddableInput,
  SavedObjectEmbeddableInput,
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

  constructor(private core: CoreStart) {}

  public getDisplayName({ embeddable }: UnlinkFromLibraryActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return i18n.translate('dashboard.panel.unlinkFromLibrary', {
      defaultMessage: 'Unlink from visualize library',
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
        (embeddable.getInput() as SavedObjectEmbeddableInput).savedObjectId &&
        embeddable.type === 'lens'
    );
  }

  public async execute({ embeddable }: UnlinkFromLibraryActionContext) {
    if (
      !embeddable.getRoot() ||
      !embeddable.getRoot().isContainer ||
      !(embeddable.getInput() as SavedObjectEmbeddableInput).savedObjectId
    ) {
      throw new IncompatibleActionError();
    }

    const currentInput = embeddable.getInput() as SavedObjectEmbeddableInput;
    const savedObject: SimpleSavedObject = await this.core.savedObjects.client.get(
      embeddable.type,
      currentInput.savedObjectId
    );

    const dashboard = embeddable.getRoot() as DashboardContainer;
    const panelToReplace = dashboard.getInput().panels[embeddable.id] as DashboardPanelState;
    if (!panelToReplace) {
      throw new PanelNotFoundError();
    }

    const newPanel: PanelState<EmbeddableInput> = {
      type: embeddable.type,
      explicitInput: {
        ...panelToReplace.explicitInput,
        savedObjectId: undefined,
        id: uuid.v4(),
        attributes: savedObject.attributes,
      },
    };
    dashboard.replacePanel(panelToReplace, newPanel);
  }
}