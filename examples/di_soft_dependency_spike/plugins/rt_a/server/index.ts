/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Option C, plugin A: classic start contract, pulls B's start contract through core.plugins.onStart.
 * The manifest lists spikeRtB under runtimePluginDependencies, which the topological sort ignores.
 */

import { schema } from '@kbn/config-schema';
import { OnStart, Start } from '@kbn/core-di';
import { CoreStart } from '@kbn/core-di-server';
import type { RtStart } from '../../../shared/tokens';
import { createSpikeModule } from '../../../shared/spike_module';

export const config = {
  schema: schema.object({ enabled: schema.boolean({ defaultValue: true }) }),
};

let fromB = 'pending';

const pluginModule = createSpikeModule({
  id: 'spikeRtA',
  bindings: ({ bind }) => {
    const contract: RtStart = { greet: () => 'hello from spikeRtA start contract' };
    bind(Start).toConstantValue(contract);
    bind(OnStart).toResolvedValue(
      (plugins) => () => {
        plugins.onStart<{ spikeRtB: RtStart }>('spikeRtB').then(({ spikeRtB }) => {
          fromB = spikeRtB.found ? spikeRtB.contract.greet() : 'absent';
        });
      },
      [CoreStart('plugins')]
    );
  },
  probe: () => ({ fromB }),
});

export { pluginModule as module };
