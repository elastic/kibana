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

import { UiComponent } from 'src/plugins/kibana_utils/public';

/**
 * Represents something that can be displayed to user in UI.
 */
export interface Presentable<Context extends object = object> {
  /**
   * ID that uniquely identifies this object.
   */
  readonly id: string;

  /**
   * Determines the display order in relation to other items. Higher numbers are
   * displayed first.
   */
  readonly order: number;

  /**
   * `UiComponent` to render when displaying this entity as a context menu item.
   * If not provided, `getDisplayName` will be used instead.
   */
  readonly MenuItem?: UiComponent<{ context: Context }>;

  /**
   * Optional EUI icon type that can be displayed along with the title.
   */
  getIconType(context: Context): string | undefined;

  /**
   * Returns a title to be displayed to the user.
   */
  getDisplayName(context: Context): string;

  /**
   * Returns tooltip text which should be displayed when user hovers this object.
   * Should return empty string if tooltip should not be displayed.
   */
  getDisplayNameTooltip(context: Context): string;

  /**
   * This method should return a link if this item can be clicked on. The link
   * is used to navigate user if user middle-clicks it or Ctrl + clicks or
   * right-clicks and selects "Open in new tab".
   */
  getHref?(context: Context): Promise<string | undefined>;

  /**
   * Returns a promise that resolves to true if this item is compatible given
   * the context and should be displayed to user, otherwise resolves to false.
   */
  isCompatible(context: Context): Promise<boolean>;
}
