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

import { CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { ManagementSetup, ManagementStart } from './types';
import { ManagementService } from './management_service';
import { KibanaLegacySetup } from '../../kibana_legacy/public';
// @ts-ignore
import { LegacyManagementAdapter } from './legacy';

export class ManagementPlugin implements Plugin<ManagementSetup, ManagementStart> {
  private managementSections = new ManagementService();
  private legacyManagement = new LegacyManagementAdapter();

  public setup(core: CoreSetup, { kibana_legacy }: { kibana_legacy: KibanaLegacySetup }) {
    return {
      sections: this.managementSections.setup(kibana_legacy, this.legacyManagement.getManagement),
    };
  }

  public start(core: CoreStart) {
    return {
      sections: this.managementSections.start(core.application.navigateToApp),
      legacy: this.legacyManagement.init(core.application.capabilities),
    };
  }
}
