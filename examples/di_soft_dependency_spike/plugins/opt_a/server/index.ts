/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Option A, plugin A: publishes OptAGreeter, softly pulls OptBGreeter from plugin B.
 */

import { inject, injectable, optional } from 'inversify';
import { schema } from '@kbn/config-schema';
import { Global } from '@kbn/core-di-internal';
import { type Greeter, OptAGreeter, OptBGreeter } from '../../../shared/tokens';
import { createSpikeModule } from '../../../shared/spike_module';

export const config = {
  schema: schema.object({ enabled: schema.boolean({ defaultValue: true }) }),
};

@injectable()
class CapturedAtFirstUse {
  constructor(@inject(OptBGreeter) @optional() private readonly greeter?: Greeter) {}
  describe() {
    return this.greeter?.greet() ?? 'absent';
  }
}

const pluginModule = createSpikeModule({
  id: 'spikeOptA',
  bindings: ({ bind }) => {
    // Provider side: what A writes to offer something.
    bind(OptAGreeter).toConstantValue({ greet: () => 'hello from spikeOptA' });
    bind(Global).toConstantValue(OptAGreeter);

    // Consumer side, the default (singleton) scope: injected once, on first use.
    bind(CapturedAtFirstUse).toSelf();
  },
  probe: (container) => ({
    lookup: container.get(OptBGreeter, { optional: true })?.greet() ?? 'absent',
    singletonInjected: container.get(CapturedAtFirstUse).describe(),
  }),
  deferredProbe: ({ inject: injectAfterStart }, container) =>
    injectAfterStart<string, [], [Greeter | undefined]>(
      { serviceIdentifier: OptBGreeter, optional: true },
      (greeter?: Greeter) => greeter?.greet() ?? 'absent'
    )(container),
});

export { pluginModule as module };
