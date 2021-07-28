/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ApplicationStart } from 'kibana/public';
import { Action } from 'src/plugins/ui_actions/public';
import { take } from 'rxjs/operators';
import { ViewMode } from '../types';
import { EmbeddableFactoryNotFoundError } from '../errors';
import { EmbeddableStart } from '../../plugin';
import { goToApp } from '../go_to_app';
import {
  IEmbeddable,
  EmbeddableEditorState,
  EmbeddableStateTransfer,
  SavedObjectEmbeddableInput,
  EmbeddableInput,
  Container,
} from '../..';

export const ACTION_EDIT_PANEL = 'editPanel';

interface ActionContext {
  embeddable: IEmbeddable;
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
    goToApp(context.embeddable, this.currentAppId || '', {
      stateTransferService: this.stateTransfer,
      application: this.application,
    });
  }
}
