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
import { ApplicationStart } from 'kibana/public';
import { Action } from 'src/plugins/ui_actions/public';
import { take } from 'rxjs/operators';
import { ViewMode } from '../types';
import { EmbeddableFactoryNotFoundError } from '../errors';
import { EmbeddableStart } from '../../plugin';
import {
  IEmbeddable,
  EmbeddableEditorState,
  EmbeddableStateTransfer,
  SavedObjectEmbeddableInput,
} from '../..';

export const ACTION_EDIT_PANEL = 'editPanel';

interface ActionContext {
  embeddable: IEmbeddable;
}

interface NavigationContext {
  app: string;
  path: string;
  state?: EmbeddableEditorState;
}

export class EditPanelAction implements Action<ActionContext> {
  public readonly type = ACTION_EDIT_PANEL;
  public readonly id = ACTION_EDIT_PANEL;
  public order = 50;
  public currentAppId: string | undefined;

  constructor(
    private readonly getEmbeddableFactory: EmbeddableStart['getEmbeddableFactory'],
    private readonly application: ApplicationStart,
    private readonly stateTransfer?: EmbeddableStateTransfer
  ) {
    if (this.application?.currentAppId$) {
      this.application.currentAppId$
        .pipe(take(1))
        .subscribe((appId: string | undefined) => (this.currentAppId = appId));
    }
  }

  public getDisplayName({ embeddable }: ActionContext) {
    const factory = this.getEmbeddableFactory(embeddable.type);
    if (!factory) {
      throw new EmbeddableFactoryNotFoundError(embeddable.type);
    }
    return i18n.translate('embeddableApi.panel.editPanel.displayName', {
      defaultMessage: 'Edit {value}',
      values: {
        value: factory.getDisplayName(),
      },
    });
  }

  getIconType() {
    return 'pencil';
  }

  public async isCompatible({ embeddable }: ActionContext) {
    const canEditEmbeddable = Boolean(
      embeddable &&
        embeddable.getOutput().editable &&
        (embeddable.getOutput().editUrl ||
          (embeddable.getOutput().editApp && embeddable.getOutput().editPath))
    );
    const inDashboardEditMode = embeddable.getInput().viewMode === ViewMode.EDIT;
    return Boolean(canEditEmbeddable && inDashboardEditMode);
  }

  public async execute(context: ActionContext) {
    const appTarget = this.getAppTarget(context);
    if (appTarget) {
      if (this.stateTransfer && appTarget.state) {
        await this.stateTransfer.navigateToEditor(appTarget.app, {
          path: appTarget.path,
          state: appTarget.state,
        });
      } else {
        await this.application.navigateToApp(appTarget.app, { path: appTarget.path });
      }
      return;
    }

    const href = await this.getHref(context);
    if (href) {
      window.location.href = href;
      return;
    }
  }

  public getAppTarget({ embeddable }: ActionContext): NavigationContext | undefined {
    const app = embeddable ? embeddable.getOutput().editApp : undefined;
    const path = embeddable ? embeddable.getOutput().editPath : undefined;
    if (app && path) {
      if (this.currentAppId) {
        const byValueMode = !(embeddable.getInput() as SavedObjectEmbeddableInput).savedObjectId;
        const state: EmbeddableEditorState = {
          originatingApp: this.currentAppId,
          byValueMode,
          valueInput: byValueMode ? embeddable.getInput() : undefined,
          embeddableId: embeddable.id,
        };
        return { app, path, state };
      }
      return { app, path };
    }
  }

  public async getHref({ embeddable }: ActionContext): Promise<string> {
    const editUrl = embeddable ? embeddable.getOutput().editUrl : undefined;
    return editUrl ? editUrl : '';
  }
}
