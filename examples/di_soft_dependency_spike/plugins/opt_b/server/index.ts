/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Option A, plugin B: publishes OptBGreeter, softly pulls OptAGreeter from plugin A.
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
  constructor(@inject(OptAGreeter) @optional() private readonly greeter?: Greeter) {}
  describe() {
    return this.greeter?.greet() ?? 'absent';
  }
}

const pluginModule = createSpikeModule({
  id: 'spikeOptB',
  bindings: ({ bind }) => {
    bind(OptBGreeter).toConstantValue({ greet: () => 'hello from spikeOptB' });
    bind(Global).toConstantValue(OptBGreeter);
    bind(CapturedAtFirstUse).toSelf();
  },
  probe: (container) => ({
    lookup: container.get(OptAGreeter, { optional: true })?.greet() ?? 'absent',
    singletonInjected: container.get(CapturedAtFirstUse).describe(),
  }),
  deferredProbe: ({ inject: injectAfterStart }, container) =>
    injectAfterStart<string, [], [Greeter | undefined]>(
      { serviceIdentifier: OptAGreeter, optional: true },
      (greeter?: Greeter) => greeter?.greet() ?? 'absent'
    )(container),
});

export { pluginModule as module };
