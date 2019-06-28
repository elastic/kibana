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

import { EuiIcon } from '@elastic/eui';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { Inspector } from 'ui/inspector';
import { Action, ActionContext } from '../../../actions';

export const INSPECT_PANEL_ACTION_ID = 'openInspector';

export class InspectPanelAction extends Action {
  public readonly type = INSPECT_PANEL_ACTION_ID;
  constructor() {
    super(INSPECT_PANEL_ACTION_ID);
    this.order = 20;
  }

  public getDisplayName() {
    return i18n.translate('embeddableApi.panel.inspectPanel.displayName', {
      defaultMessage: 'Inspect',
    });
  }

  public getIcon() {
    return <EuiIcon type="inspect" />;
  }

  public async isCompatible({ embeddable }: ActionContext) {
    return Inspector.isAvailable(embeddable.getInspectorAdapters());
  }

  public async execute({ embeddable }: ActionContext) {
    const adapters = embeddable.getInspectorAdapters();

    if (!(await this.isCompatible({ embeddable })) || adapters === undefined) {
      throw new Error('Action not compatible with context');
    }

    const session = Inspector.open(adapters, {
      title: embeddable.getTitle(),
    });
    // Overwrite the embeddables.destroy() function to close the inspector
    // before calling the original destroy method
    const originalDestroy = embeddable.destroy;
    embeddable.destroy = () => {
      session.close();
      if (originalDestroy) {
        originalDestroy.call(embeddable);
      }
    };
    // In case the inspector gets closed (otherwise), restore the original destroy function
    session.onClose.finally(() => {
      embeddable.destroy = originalDestroy;
    });
  }
}
