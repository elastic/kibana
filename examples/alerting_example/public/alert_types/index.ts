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

import { registerNavigation as registerPeopleInSpaceNavigation } from './astros';
import { ALERTING_EXAMPLE_APP_ID } from '../../common/constants';
import { SanitizedAlert } from '../../../../x-pack/plugins/alerts/common';
import { PluginSetupContract as AlertingSetup } from '../../../../x-pack/plugins/alerts/public';

export function registerNavigation(alerts: AlertingSetup) {
  // register default navigation
  alerts.registerDefaultNavigation(
    ALERTING_EXAMPLE_APP_ID,
    (alert: SanitizedAlert) => `/alert/${alert.id}`
  );

  registerPeopleInSpaceNavigation(alerts);
}
