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
import routes from 'ui/routes';
import { npStart, npSetup } from 'ui/new_platform';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { TelemetryManagementSection } from '../../../../../../plugins/telemetry/public/components';

routes.defaults(/\/management/, {
  resolve: {
    telemetryManagementSection() {
      const { telemetry } = npStart.plugins as any;
      const { advancedSettings } = npSetup.plugins as any;

      if (telemetry && advancedSettings) {
        const componentRegistry = advancedSettings.component;
        const Component = (props: any) => (
          <TelemetryManagementSection
            showAppliesSettingMessage={true}
            telemetryService={telemetry.telemetryService}
            {...props}
          />
        );

        componentRegistry.register(
          componentRegistry.componentType.PAGE_FOOTER_COMPONENT,
          Component,
          true
        );
      }
    },
  },
});
