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

import React from 'react';
import { TelemetryPluginSetup } from 'src/plugins/telemetry/public';
import { TelemetryManagementSection } from './telemetry_management_section';

// It should be this but the types are way too vague in the AdvancedSettings plugin `Record<string, any>`
// type Props = Omit<TelemetryManagementSection['props'], 'telemetryService'>;
type Props = any;

export function telemetryManagementSectionWrapper(
  telemetryService: TelemetryPluginSetup['telemetryService']
) {
  const TelemetryManagementSectionWrapper = (props: Props) => (
    <TelemetryManagementSection
      showAppliesSettingMessage={true}
      telemetryService={telemetryService}
      {...props}
    />
  );

  return TelemetryManagementSectionWrapper;
}
