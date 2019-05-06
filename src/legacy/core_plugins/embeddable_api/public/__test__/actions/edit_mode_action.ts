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

import { ViewMode } from 'plugins/embeddable_api/types';
import { Action, ActionContext } from '../../actions';

export const EDIT_MODE_ACTION = 'EDIT_MODE_ACTION';

export class EditModeAction extends Action {
  constructor() {
    super(EDIT_MODE_ACTION);
  }

  getTitle() {
    return `I should only show up in edit mode`;
  }

  isCompatible(context: ActionContext) {
    return Promise.resolve(context.embeddable.getInput().viewMode === ViewMode.EDIT);
  }

  execute() {
    return;
  }
}
