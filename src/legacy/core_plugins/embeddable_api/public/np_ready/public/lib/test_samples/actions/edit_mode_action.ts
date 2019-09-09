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

import { ViewMode } from '../../types';
import { Action } from '../../actions';
import { IEmbeddable } from '../../embeddables';

export const EDIT_MODE_ACTION = 'EDIT_MODE_ACTION';

interface ActionContext {
  embeddable: IEmbeddable;
}
export class EditModeAction extends Action<ActionContext> {
  public readonly type = EDIT_MODE_ACTION;

  constructor() {
    super(EDIT_MODE_ACTION);
  }

  getDisplayName() {
    return `I should only show up in edit mode`;
  }

  async isCompatible(context: ActionContext) {
    return context.embeddable.getInput().viewMode === ViewMode.EDIT;
  }

  async execute() {
    return;
  }
}
