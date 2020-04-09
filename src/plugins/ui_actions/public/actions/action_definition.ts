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
import { ActionType, ActionContextMapping } from '../types';

export interface ActionDefinition<T extends ActionType> {
  /**
   * Determined the order when there is more than one action matched to a trigger.
   * Higher numbers are displayed first.
   */
  order?: number;

  /**
   * A unique identifier for this action instance.
   */
  id?: string;

  /**
   * The action type is what determines the context shape.
   */
  readonly type: T;

  /**
   * Optional EUI icon type that can be displayed along with the title.
   */
  getIconType?(context: ActionContextMapping[T]): string;

  /**
   * Returns a title to be displayed to the user.
   * @param context
   */
  getDisplayName?(context: ActionContextMapping[T]): string;

  /**
   * `UiComponent` to render when displaying this action as a context menu item.
   * If not provided, `getDisplayName` will be used instead.
   */
  MenuItem?: UiComponent<{ context: ActionContextMapping[T] }>;

  /**
   * Returns a promise that resolves to true if this action is compatible given the context,
   * otherwise resolves to false.
   */
  isCompatible?(context: ActionContextMapping[T]): Promise<boolean>;

  /**
   * If this returns something truthy, this is used in addition to the `execute` method when clicked.
   */
  getHref?(context: ActionContextMapping[T]): string | undefined;

  /**
   * Executes the action.
   */
  execute(context: ActionContextMapping[T]): Promise<void>;
}
