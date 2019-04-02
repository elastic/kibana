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

import chrome from 'ui/chrome';
import { visualizationLoader } from 'ui/visualize/loader/visualization_loader';
import { VisProvider } from 'ui/visualize/loader/vis';

export const visualization = () => ({
  name: 'visualization',
  displayName: 'visualization',
  reuseDomNode: true,
  render: async (domNode, config, handlers) => {
    const { visData, visConfig, params } = config;
    const visType = config.visType || visConfig.type;
    const $injector = await chrome.dangerouslyGetActiveInjector();
    const Private = $injector.get('Private');
    const Vis = Private(VisProvider);

    if (handlers.vis) {
      // special case in visualize, we need to render first (without executing the expression), for maps to work
      if (visConfig) {
        handlers.vis.setCurrentState({ type: visType, params: visConfig });
      }
    } else {
      handlers.vis = new Vis({
        type: visType,
        params: visConfig,
      });
      handlers.vis.eventsSubject = handlers.eventsSubject;
    }

    const uiState = handlers.uiState || handlers.vis.getUiState();

    handlers.onDestroy(() => visualizationLoader.destroy());

    await visualizationLoader.render(domNode, handlers.vis, visData, handlers.vis.params, uiState, params).then(() => {
      if (handlers.done) handlers.done();
    });
  },
});
