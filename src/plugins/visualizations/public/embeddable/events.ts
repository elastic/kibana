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
  APPLY_FILTER_TRIGGER,
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
} from '../../../../plugins/ui_actions/public';

export interface VisEventToTrigger {
  ['applyFilter']: typeof APPLY_FILTER_TRIGGER;
  ['brush']: typeof SELECT_RANGE_TRIGGER;
  ['filter']: typeof VALUE_CLICK_TRIGGER;
}

export const VIS_EVENT_TO_TRIGGER: VisEventToTrigger = {
  applyFilter: APPLY_FILTER_TRIGGER,
  brush: SELECT_RANGE_TRIGGER,
  filter: VALUE_CLICK_TRIGGER,
};
