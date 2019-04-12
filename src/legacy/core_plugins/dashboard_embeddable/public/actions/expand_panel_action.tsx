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
import { i18n } from '@kbn/i18n';
import {
  Action,
  actionRegistry,
  Embeddable,
  CONTEXT_MENU_TRIGGER,
  triggerRegistry,
  ViewMode,
} from 'plugins/embeddable_api/index';
import React from 'react';
import { DASHBOARD_CONTAINER_TYPE, DashboardContainer } from '../embeddable';

export const EXPAND_PANEL_ACTION = 'EXPAND_PANEL_ACTION';

function isDashboard(embeddable: Embeddable): embeddable is DashboardContainer {
  return (embeddable as DashboardContainer).type === DASHBOARD_CONTAINER_TYPE;
}

export class ExpandPanelAction extends Action {
  constructor() {
    super('EXPAND_PANEL_ACTION');
    this.priority = 7;
  }

  public getTitle({ embeddable }: { embeddable: Embeddable }) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new Error('Action is incompatible with context');
    }

    return embeddable.parent.getInput().expandedPanelId
      ? i18n.translate('kbn.embeddable.actions.toggleExpandPanel.expandedDisplayName', {
          defaultMessage: 'Minimize',
        })
      : i18n.translate('kbn.embeddable.actions.toggleExpandPanel.notExpandedDisplayName', {
          defaultMessage: 'Full screen',
        });
  }

  public getIcon({ embeddable }: { embeddable: Embeddable }) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new Error('Action is incompatible with context');
    }
    const isExpanded = embeddable.parent.getInput().expandedPanelId === embeddable.id;
    return <EuiIcon type={isExpanded ? 'expand' : 'expand'} />;
  }

  public isCompatible({ embeddable }: { embeddable: Embeddable }) {
    return Promise.resolve(
      Boolean(
        embeddable.parent &&
          isDashboard(embeddable.parent) &&
          embeddable.getInput().viewMode === ViewMode.VIEW
      )
    );
  }

  public execute({ embeddable }: { embeddable: Embeddable }) {
    if (!embeddable.parent || !isDashboard(embeddable.parent)) {
      throw new Error('Action is incompatible with context');
    }
    embeddable.parent.onToggleExpandPanel(embeddable.id);
  }
}

actionRegistry.addAction(new ExpandPanelAction());

triggerRegistry.attachAction({
  triggerId: CONTEXT_MENU_TRIGGER,
  actionId: EXPAND_PANEL_ACTION,
});
