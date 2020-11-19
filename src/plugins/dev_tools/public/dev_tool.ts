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

import { AppMount } from 'src/core/public';

/**
 * Descriptor for a dev tool. A dev tool works similar to an application
 * registered in the core application service.
 */
export type CreateDevToolArgs = Omit<DevToolApp, 'enable' | 'disable' | 'isDisabled'> & {
  disabled?: boolean;
};

export class DevToolApp {
  /**
   * The id of the dev tools. This will become part of the URL path
   * (`dev_tools/${devTool.id}`. It has to be unique among registered
   * dev tools.
   */
  public readonly id: string;
  /**
   * The human readable name of the dev tool. Should be internationalized.
   * This will be used as a label in the tab above the actual tool.
   */
  public readonly title: string;
  public readonly mount: AppMount;

  /**
   * Flag indicating to disable the tab of this dev tool. Navigating to a
   * disabled dev tool will be treated as the navigation to an unknown route
   * (redirect to the console).
   */
  private disabled: boolean;

  /**
   * Optional tooltip content of the tab.
   */
  public readonly tooltipContent?: string;
  /**
   * Flag indicating whether the dev tool will do routing within the `dev_tools/${devTool.id}/`
   * prefix. If it is set to true, the dev tool is responsible to redirect
   * the user when navigating to unknown URLs within the prefix. If set
   * to false only the root URL of the dev tool will be recognized as valid.
   */
  public readonly enableRouting: boolean;
  /**
   * Number used to order the tabs.
   */
  public readonly order: number;

  constructor(
    id: string,
    title: string,
    mount: AppMount,
    enableRouting: boolean,
    order: number,
    toolTipContent = '',
    disabled = false
  ) {
    this.id = id;
    this.title = title;
    this.mount = mount;
    this.enableRouting = enableRouting;
    this.order = order;
    this.tooltipContent = toolTipContent;
    this.disabled = disabled;
  }

  public enable() {
    this.disabled = false;
  }

  public disable() {
    this.disabled = true;
  }

  public isDisabled(): boolean {
    return this.disabled;
  }
}

export const createDevToolApp = ({
  id,
  title,
  mount,
  enableRouting,
  order,
  tooltipContent,
  disabled,
}: CreateDevToolArgs) =>
  new DevToolApp(id, title, mount, enableRouting, order, tooltipContent, disabled);
