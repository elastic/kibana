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

import {
  UiActionsActionDefinition,
  UiActionsActionDefinitionContext as ActionDefinitionContext,
} from 'src/plugins/ui_actions/public';
import { IEmbeddable } from '..';

interface Context {
  embeddable: IEmbeddable;
}

export const COPY_PNG_ACTION = 'COPY_PNG_ACTION';

export class CopyPngAction implements UiActionsActionDefinition<Context> {
  public readonly id = COPY_PNG_ACTION;
  public readonly order = 25;

  public readonly getDisplayName = () => 'Copy PNG';
  public readonly getIconType = () => 'copy';

  public readonly isCompatible = async (
    context: ActionDefinitionContext<Context>
  ): Promise<boolean> => {
    return true;
  };

  public readonly execute = async (context: ActionDefinitionContext<Context>): Promise<void> => {
    alert('lala');
  };
}
