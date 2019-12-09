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
import { ManagementSections } from './ManagementSections';
import { KibanaLegacySetup } from '../../kibana_legacy/public';

export class ManagementPlugin implements Plugin<ManagementSetup, ManagementStart> {
  private managementSections = new ManagementSections();

  public setup(core: CoreSetup, { kibana_legacy }: { kibana_legacy: KibanaLegacySetup }) {
    // public setup(core: CoreSetup) {
    console.log('ManagementPlugin setup');

    console.log('core', core);
    console.log(kibana_legacy);
    /*
    kibana_legacy.registerLegacyApp({
      id: 'management/foo',
      title: 'Management',
      mount: async (appMountContext, params) => {
        render(<div>hello foo</div>, params.element);

        return () => unmountComponentAtNode(params.element);
      },
    });
    */

    /*
    kibana_legacy.registerLegacyApp({
      id: 'management',
      title: 'Management',
      mount: async (appMountContext, params) => {
        const { renderApp } = await import('./application');
        return renderApp(params.element, appMountContext, params.appBasePath);
      },
    });
    */

    return {
      sections: this.managementSections.setup,
    };
  }

  public start(core: CoreStart) {
    console.log('ManagementPlugin start');
    console.log('core', core);
    return {
      sections: this.managementSections.start(core.application.capabilities),
    };
  }
}
