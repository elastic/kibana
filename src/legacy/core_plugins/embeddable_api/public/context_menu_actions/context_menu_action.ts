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
import { EuiContextMenuItemIcon } from '@elastic/eui';
import { IEmbeddable } from '../embeddables';
import { ContextMenuPanel } from './context_menu_panel';
import { ActionContext } from '../actions';

interface ContextMenuActionOptions<E extends IEmbeddable = IEmbeddable> {
  /**
   * Optionally specify the order of the menu items.
   */
  order?: number;

  /**
   * An optional child context menu to display when the action is clicked.
   */
  childContextMenuPanel?: ContextMenuPanel<E>;

  /**
   * Whether this action should be disabled based on the parameters given.
   */
  isDisabled?: (actionAPI: ActionContext<E>) => boolean;

  /**
   * Whether this action should be visible based on the parameters given.
   */
  isVisible?: (panelActionAPI: ActionContext<E>) => boolean;

  /**
   * Determines which ContextMenuPanel this action is displayed on.
   */
  parentPanelId?: string;

  /**
   * Optional icon to display to the left of the action.
   */
  icon?: EuiContextMenuItemIcon;
}

interface ContextMenuButtonOptions<E extends IEmbeddable> extends ContextMenuActionOptions<E> {
  /**
   * An optional action to take when the action is clicked on. Either this or childContextMenuPanel should be
   * given.
   */
  onClick?: (actionAPI: ActionContext<E>) => void;
}

interface ContextMenuLinkOptions<E extends IEmbeddable = IEmbeddable>
  extends ContextMenuActionOptions<E> {
  /**
   * An optional href to use as navigation when the action is clicked on.
   */
  getHref?: (actionAPI: ActionContext<E>) => string;
}

interface ContextMenuActionsConfig {
  id: string;

  /**
   * Determines which ContextMenuPanel this action is displayed on.
   */
  parentPanelId: string;

  /**
   * Return display name of the action in the menu
   */
  displayName: string;
}

export class ContextMenuAction<TEmbeddable extends IEmbeddable = IEmbeddable> {
  /**
   * Use to adjust order.
   */
  public readonly order: number = 0;

  public readonly id: string;

  /**
   * Optional icon to display to the left of the action.
   */
  public readonly icon?: EuiContextMenuItemIcon;

  /**
   * Optional child context menu to open when the action is clicked.
   */
  public readonly childContextMenuPanel?: ContextMenuPanel<TEmbeddable>;

  /**
   * Determines which ContextMenuPanel this action is displayed on.
   */
  public readonly parentPanelId: string;

  /**
   * @param context
   */
  public readonly onClick?: (context: ActionContext<TEmbeddable>) => void;

  /**
   * @param context
   */
  public readonly getHref?: (context: ActionContext<TEmbeddable>) => string;

  /**
   * @param {PanelActionAPI} panelActionAPI
   */
  public readonly displayName: string;

  /**
   *
   * @param {string} config.id
   * @param {string} config.parentPanelId - set if this action belongs on a nested child panel
   * @param {function} options.onClick
   * @param {ContextMenuPanel} options.childContextMenuPanel - optional child panel to open when clicked.
   * @param {function} options.isDisabled - optionally set a custom disabled function
   * @param {function} options.isVisible - optionally set a custom isVisible function
   * @param {function} options.getHref
   * @param {function} options.getDisplayName
   * @param {Element} options.icon
   */
  public constructor(
    config: ContextMenuActionsConfig,
    options: ContextMenuButtonOptions<TEmbeddable> | ContextMenuLinkOptions<TEmbeddable>
  ) {
    this.id = config.id;
    this.parentPanelId = config.parentPanelId;

    this.order = options.order || 0;
    this.icon = options.icon;
    this.childContextMenuPanel = options.childContextMenuPanel;
    this.displayName = config.displayName;

    if ('onClick' in options) {
      this.onClick = options.onClick;
    }

    if (options.isDisabled) {
      this.isDisabled = options.isDisabled;
    }

    if (options.isVisible) {
      this.isVisible = options.isVisible;
    }

    if ('getHref' in options) {
      this.getHref = options.getHref;
    }
  }

  /**
   * Whether this action should be visible based on the parameters given.  Defaults to always visible.
   * @param {context}
   * @return {boolean}
   */
  public isVisible(context: ActionContext<TEmbeddable>): boolean {
    return true;
  }

  /**
   * Whether this action should be disabled based on the parameters given. Defaults to always enabled.
   * @param {context}
   */
  public isDisabled(context: ActionContext<TEmbeddable>): boolean {
    return false;
  }
}
