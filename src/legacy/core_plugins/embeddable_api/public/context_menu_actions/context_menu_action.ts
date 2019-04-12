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
import { Container } from '../containers';
import { Embeddable } from '../embeddables';
import { ContextMenuPanel } from './context_menu_panel';
import { PanelActionAPI } from './types';

interface ContextMenuActionOptions<
  E extends Embeddable = Embeddable,
  C extends Container = Container
> {
  /**
   * Optionally specify a priority to adjust  the order of the menu items.
   */
  priority?: number;

  /**
   * An optional child context menu to display when the action is clicked.
   */
  childContextMenuPanel?: ContextMenuPanel<E, C>;

  /**
   * Whether this action should be disabled based on the parameters given.
   */
  isDisabled?: (actionAPI: PanelActionAPI<E, C>) => boolean;

  /**
   * Whether this action should be visible based on the parameters given.
   */
  isVisible?: (panelActionAPI: PanelActionAPI<E, C>) => boolean;

  /**
   * Determines which ContextMenuPanel this action is displayed on.
   */
  parentPanelId?: string;

  /**
   * Optional icon to display to the left of the action.
   */
  icon?: EuiContextMenuItemIcon;
}

interface ContextMenuButtonOptions<E extends Embeddable, C extends Container>
  extends ContextMenuActionOptions<E, C> {
  /**
   * An optional action to take when the action is clicked on. Either this or childContextMenuPanel should be
   * given.
   */
  onClick?: (actionAPI: PanelActionAPI<E, C>) => void;
}

interface ContextMenuLinkOptions<
  E extends Embeddable = Embeddable,
  C extends Container = Container
> extends ContextMenuActionOptions<E, C> {
  /**
   * An optional href to use as navigation when the action is clicked on.
   */
  getHref?: (actionAPI: PanelActionAPI<E, C>) => string;
}

interface ContextMenuActionsConfig {
  id: string;

  /**
   * Display name of the action in the menu
   */
  displayName: string;

  /**
   * Determines which ContextMenuPanel this action is displayed on.
   */
  parentPanelId: string;
}

export class ContextMenuAction<E extends Embeddable = Embeddable, C extends Container = Container> {
  /**
   * Use to adjust order.
   */
  public readonly priority: number = 0;

  public readonly id: string;

  /**
   * Optional icon to display to the left of the action.
   */
  public readonly icon?: EuiContextMenuItemIcon;

  /**
   * Display name of the action in the menu
   */
  public readonly displayName: string;

  /**
   * Optional child context menu to open when the action is clicked.
   */
  public readonly childContextMenuPanel?: ContextMenuPanel<E, C>;

  /**
   * Determines which ContextMenuPanel this action is displayed on.
   */
  public readonly parentPanelId: string;

  /**
   * @param {PanelActionAPI} panelActionAPI
   */
  public readonly onClick?: (panelActionAPI: PanelActionAPI<E, C>) => void;

  /**
   * @param {PanelActionAPI} panelActionAPI
   */
  public readonly getHref?: (panelActionAPI: PanelActionAPI<E, C>) => string;

  /**
   *
   * @param {string} config.id
   * @param {string} config.displayName
   * @param {string} config.parentPanelId - set if this action belongs on a nested child panel
   * @param {function} options.onClick
   * @param {ContextMenuPanel} options.childContextMenuPanel - optional child panel to open when clicked.
   * @param {function} options.isDisabled - optionally set a custom disabled function
   * @param {function} options.isVisible - optionally set a custom isVisible function
   * @param {function} options.getHref
   * @param {Element} options.icon
   */
  public constructor(
    config: ContextMenuActionsConfig,
    options: ContextMenuButtonOptions<E, C> | ContextMenuLinkOptions<E, C> = {}
  ) {
    this.id = config.id;
    this.displayName = config.displayName;
    this.parentPanelId = config.parentPanelId;

    this.priority = options.priority || 0;
    this.icon = options.icon;
    this.childContextMenuPanel = options.childContextMenuPanel;

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
   * @param {PanelActionAPI} panelActionAPI
   * @return {boolean}
   */
  public isVisible(panelActionAPI: PanelActionAPI<E, C>): boolean {
    return true;
  }

  /**
   * Whether this action should be disabled based on the parameters given. Defaults to always enabled.
   * @param {PanelActionAPI} panelActionAPI
   */
  public isDisabled(panelActionAPI: PanelActionAPI<E, C>): boolean {
    return false;
  }
}
