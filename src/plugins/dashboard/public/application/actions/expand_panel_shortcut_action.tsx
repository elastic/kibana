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
import { EuiBadge, EuiButtonIcon } from '@elastic/eui';
import { IEmbeddable, ViewMode, isReferenceOrValueEmbeddable } from '../../embeddable_plugin';
import { ActionByType, IncompatibleActionError } from '../../ui_actions_plugin';
import { reactToUiComponent } from '../../../../kibana_react/public';
import { ExpandPanelAction, isDashboard, isExpanded } from './expand_panel_action';

export const ACTION_EXPAND_PANEL_SHORTCUT = 'ACTION_EXPAND_PANEL_SHORTCUT';

export interface ExpandPanelShortcutActionContext {
  embeddable: IEmbeddable;
}
export class ExpandPanelShortcutAction
  implements ActionByType<typeof ACTION_EXPAND_PANEL_SHORTCUT> {
  public readonly id = ACTION_EXPAND_PANEL_SHORTCUT;
  public readonly type = ACTION_EXPAND_PANEL_SHORTCUT;
  public readonly order = 1;

  private minimizeMessage = i18n.translate(
    'dashboard.actions.toggleExpandPanelBadge.minimizeAriaLabel',
    {
      defaultMessage: 'Minimize this panel',
    }
  );

  private maximizeMessage = i18n.translate(
    'dashboard.actions.toggleExpandPanelBadge.minimizeAriaLabel',
    {
      defaultMessage: 'Maximize this panel',
    }
  );

  constructor(private expandPanelAction: ExpandPanelAction) {}

  public readonly MenuItem = reactToUiComponent(
    ({ context }: { context: ExpandPanelShortcutActionContext }) => (
      <EuiButtonIcon
        className="embPanel__expandPanelBadge"
        color="text"
        style={{ marginTop: '-1px' }}
        iconType={this.getIconType({ embeddable: context.embeddable })}
        onClick={() => this.expandPanelAction.execute({ embeddable: context.embeddable })}
      />
    )
  );

  public getIconType({ embeddable }: ExpandPanelShortcutActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return isExpanded(embeddable) ? 'minimize' : 'expand';
  }

  public getDisplayName({ embeddable }: ExpandPanelShortcutActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return '';
  }

  // public getDisplayNameTooltip = ({ embeddable }: ExpandPanelShortcutActionContext) => {
  //   if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
  //     throw new IncompatibleActionError();
  //   }
  //   return isExpanded(embeddable) ? this.minimizeMessage : this.maximizeMessage;
  // };

  public isCompatible = async ({ embeddable }: ExpandPanelShortcutActionContext) => {
    return Boolean(embeddable.parent && isDashboard(embeddable.parent));
  };

  public execute = async () => {};
}
