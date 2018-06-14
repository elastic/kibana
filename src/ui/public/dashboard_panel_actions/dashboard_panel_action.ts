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

import { DashboardContextMenuPanel } from './dashboard_context_menu_panel';
import { PanelActionAPI } from './types';

interface DashboardPanelActionOptions {
  /**
   * An optional action to take when the action is clicked on. Either this or childContextMenuPanel should be
   * given.
   */
  onClick?: (actionAPI: PanelActionAPI) => void;

  /**
   * An optional child context menu to display when the action is clicked.
   */
  childContextMenuPanel?: DashboardContextMenuPanel;

  /**
   * Whether this action should be disabled based on the parameters given.
   * @param {PanelActionAPI} panelActionAPI
   * @return {boolean}
   */
  isDisabled?: (actionAPI: PanelActionAPI) => boolean;

  /**
   * Whether this action should be visible based on the parameters given.
   * @param {PanelActionAPI} panelActionAPI
   * @return {boolean}
   */
  isVisible?: (panelActionAPI: PanelActionAPI) => boolean;

  /**
   * Determines which DashboardContextMenuPanel this action is displayed on.
   */
  parentPanelId?: string;

  /**
   * Optional icon to display to the left of the action.
   */
  icon?: Node;
}

interface DashboardPanelActionsConfig {
  id: string;

  /**
   * Display name of the action in the menu
   */
  displayName: string;

  /**
   * Determines which DashboardContextMenuPanel this action is displayed on.
   */
  parentPanelId: string;
}

export abstract class DashboardPanelAction {
  public readonly id: string;

  /**
   * Optional icon to display to the left of the action.
   */
  public readonly icon?: Node;

  /**
   * Display name of the action in the menu
   */
  public readonly displayName: string;

  /**
   * Optional child context menu to open when the action is clicked.
   */
  public readonly childContextMenuPanel?: DashboardContextMenuPanel;

  /**
   * Determines which DashboardContextMenuPanel this action is displayed on.
   */
  public readonly parentPanelId: string;

  /**
   *
   * @param {string} config.id
   * @param {string} config.displayName
   * @param {string} config.parentPanelId - set if this action belongs on a nested child panel
   * @param {function} options.onClick
   * @param {DashboardContextMenuPanel} options.childContextMenuPanel - optional child panel to open when clicked.
   * @param {function} options.isDisabled - optionally set a custom disabled function
   * @param {function} options.isVisible - optionally set a custom isVisible function
   * @param {Element} options.icon
   */
  protected constructor(
    config: DashboardPanelActionsConfig,
    options: DashboardPanelActionOptions = {}
  ) {
    this.id = config.id;
    this.displayName = config.displayName;
    this.parentPanelId = config.parentPanelId;

    this.icon = options.icon;
    this.childContextMenuPanel = options.childContextMenuPanel;

    if (options.onClick) {
      this.onClick = options.onClick;
    }

    if (options.isDisabled) {
      this.isDisabled = options.isDisabled;
    }

    if (options.isVisible) {
      this.isVisible = options.isVisible;
    }
  }

  /**
   * @param {PanelActionAPI} panelActionAPI
   */
  public onClick(panelActionAPI: PanelActionAPI): void {
    return;
  }

  /**
   * Whether this action should be visible based on the parameters given.  Defaults to always visible.
   * @param {PanelActionAPI} panelActionAPI
   * @return {boolean}
   */
  public isVisible(panelActionAPI: PanelActionAPI): boolean {
    return true;
  }

  /**
   * Whether this action should be disabled based on the parameters given. Defaults to always enabled.
   * @param {PanelActionAPI} panelActionAPI
   */
  public isDisabled(panelActionAPI: PanelActionAPI): boolean {
    return false;
  }
}
