/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import type { Action } from '../../../../../../ui_actions/public/actions/action';
import { IncompatibleActionError } from '../../../../../../ui_actions/public/actions/incompatible_action_error';
import { ViewMode } from '../../../../../common/types';
import type { ContainerInput, IContainer } from '../../../containers/i_container';
import type { IEmbeddable } from '../../../embeddables/i_embeddable';

export const REMOVE_PANEL_ACTION = 'deletePanel';

interface ExpandedPanelInput extends ContainerInput {
  expandedPanelId: string;
}

interface ActionContext {
  embeddable: IEmbeddable;
}

function hasExpandedPanelInput(
  container: IContainer
): container is IContainer<{}, ExpandedPanelInput> {
  return (container as IContainer<{}, ExpandedPanelInput>).getInput().expandedPanelId !== undefined;
}

export class RemovePanelAction implements Action<ActionContext> {
  public readonly type = REMOVE_PANEL_ACTION;
  public readonly id = REMOVE_PANEL_ACTION;
  public order = 1;

  constructor() {}

  public getDisplayName() {
    return i18n.translate('embeddableApi.panel.removePanel.displayName', {
      defaultMessage: 'Delete from dashboard',
    });
  }

  public getIconType() {
    return 'trash';
  }

  public async isCompatible({ embeddable }: ActionContext) {
    const isPanelExpanded =
      embeddable.parent &&
      hasExpandedPanelInput(embeddable.parent) &&
      embeddable.parent.getInput().expandedPanelId === embeddable.id;

    return Boolean(
      embeddable.parent && embeddable.getInput().viewMode === ViewMode.EDIT && !isPanelExpanded
    );
  }

  public async execute({ embeddable }: ActionContext) {
    if (!embeddable.parent || !(await this.isCompatible({ embeddable }))) {
      throw new IncompatibleActionError();
    }
    embeddable.parent.removeEmbeddable(embeddable.id);
  }
}
