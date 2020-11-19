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

/**
 * These keys are used for navigating combobox UI components.
 *
 * UP: Select the previous item in the list.
 * DOWN: Select the next item in the list.
 * ENTER / TAB: Complete input with the current selection.
 * ESC: Deselect the current selection and hide the list.
 */

import { DOWN, ENTER, ESCAPE, TAB, UP } from '../key_codes';

export const comboBoxKeyCodes = {
  DOWN,
  ENTER,
  ESCAPE,
  TAB,
  UP,
};
