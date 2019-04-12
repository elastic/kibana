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
import { ViewMode } from '../../../';
import { Action, ExecuteActionContext } from '../../../actions';
import { Embeddable } from '../../../embeddables';

export const REMOVE_PANEL_ACTION = 'REMOVE_PANEL_ACTION';

export class RemovePanelAction extends Action {
  constructor() {
    super(REMOVE_PANEL_ACTION);

    this.priority = 6;
  }

  public getTitle() {
    return i18n.translate('kbn.embeddable.panel.removePanel.displayName', {
      defaultMessage: 'Delete from dashboard',
    });
  }

  public getIcon() {
    return <EuiIcon type="trash" />;
  }

  public isCompatible({ embeddable }: { embeddable: Embeddable }) {
    return Promise.resolve(
      Boolean(embeddable.parent && embeddable.getInput().viewMode === ViewMode.EDIT)
    );
  }

  public execute({ embeddable }: ExecuteActionContext<Embeddable>) {
    if (!embeddable.parent) {
      throw new Error('Remove action requires embeddable to be in a container');
    }
    embeddable.parent.removeEmbeddable(embeddable.id);
  }
}
