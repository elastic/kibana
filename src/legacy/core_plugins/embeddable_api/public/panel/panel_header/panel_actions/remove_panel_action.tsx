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
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIcon } from '@elastic/eui';
import { ContainerInput, IContainer } from '../../../containers';
import { ViewMode } from '../../../types';
import { Action, ActionContext, IncompatibleActionError } from '../../../actions';

export const REMOVE_PANEL_ACTION = 'deletePanel';

interface ExpandedPanelInput extends ContainerInput {
  expandedPanelId: string;
}

function hasExpandedPanelInput(
  container: IContainer | IContainer<ExpandedPanelInput>
): container is IContainer<ExpandedPanelInput> {
  return (container as IContainer<ExpandedPanelInput>).getInput().expandedPanelId !== undefined;
}

export class RemovePanelAction extends Action {
  public readonly type = REMOVE_PANEL_ACTION;
  constructor() {
    super(REMOVE_PANEL_ACTION);

    this.order = 5;
  }

  public getDisplayName() {
    return i18n.translate('embeddableApi.panel.removePanel.displayName', {
      defaultMessage: 'Delete from dashboard',
    });
  }

  public getIcon() {
    return <EuiIcon type="trash" />;
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

  public execute({ embeddable }: ActionContext) {
    if (!embeddable.parent || !this.isCompatible({ embeddable })) {
      throw new IncompatibleActionError();
    }
    embeddable.parent.removeEmbeddable(embeddable.id);
  }
}
