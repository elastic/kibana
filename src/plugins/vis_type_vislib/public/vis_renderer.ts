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

import { ExpressionRenderDefinition } from '../../expressions/public';
import { ChartsPluginSetup } from '../../charts/public';

import { VisTypeVislibCoreSetup } from './plugin';
import { VislibRenderValue, vislibVisName } from './vis_type_vislib_vis_fn';
import { VislibVisController } from './vis_controller';

const vislibVisRegistry = new Map<HTMLElement, VislibVisController>();

export const getVislibVisRenderer: (
  core: VisTypeVislibCoreSetup,
  charts: ChartsPluginSetup
) => ExpressionRenderDefinition<VislibRenderValue> = (core, charts) => ({
  name: vislibVisName,
  reuseDomNode: false,
  render: async (domNode, config, handlers) => {
    let registeredController = vislibVisRegistry.get(domNode);

    if (!registeredController) {
      const { createVislibVisController } = await import('./vis_controller');

      const Controller = createVislibVisController(core, charts);
      registeredController = new Controller(domNode);
      vislibVisRegistry.set(domNode, registeredController);

      handlers.onDestroy(() => {
        registeredController?.destroy();
        vislibVisRegistry.delete(domNode);
      });
    }

    await registeredController.render(config.visData, config.visConfig, handlers);
  },
});
