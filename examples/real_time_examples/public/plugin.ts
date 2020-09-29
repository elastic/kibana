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

import { Plugin, CoreSetup, CoreStart, AppNavLinkStatus } from '../../../src/core/public';
import { RealTimePluginSetup, RealTimesPluginStart } from '../../../src/plugins/real_time/public';
import { DeveloperExamplesSetup } from '../../developer_examples/public';
import { mount } from './mount';

export interface SetupDependencies {
  realTime: RealTimePluginSetup;
  developerExamples: DeveloperExamplesSetup;
}

export interface StartDependencies {
  realTime: RealTimesPluginStart;
}

export class RealTimeExamplesPlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies> {
  public setup(core: CoreSetup<StartDependencies>, plugins: SetupDependencies) {
    const { developerExamples } = plugins;

    core.application.register({
      id: 'realTimeExamples',
      title: 'Real-time plugin examples',
      navLinkStatus: AppNavLinkStatus.hidden,
      mount: mount(plugins, core),
    });

    developerExamples.register({
      appId: 'realTimeExamples',
      title: 'Real-time plugin',
      description: 'Examples showcasing real_time plugin',
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/tree/master/src/plugins/real_time',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
      ],
    });
  }

  public start(core: CoreStart, plugins: StartDependencies) {}

  public stop() {}
}
