/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Option B, plugin A: owns a widget registry (like embeddable) and contributes a widget to B's.
 */

import { injectable } from 'inversify';
import { schema } from '@kbn/config-schema';
import { OnStart } from '@kbn/core-di';
import { Global } from '@kbn/core-di-internal';
import { RegAWidget, RegBWidget, type WidgetFactory } from '../../../shared/tokens';
import { createSpikeModule } from '../../../shared/spike_module';

export const config = {
  schema: schema.object({ enabled: schema.boolean({ defaultValue: true }) }),
};

@injectable()
class WidgetRegistry {
  private readonly factories = new Map<string, WidgetFactory>();
  register(factory: WidgetFactory) {
    this.factories.set(factory.type, factory);
  }
  list() {
    return [...this.factories.values()].map((factory) => factory.render());
  }
}

const pluginModule = createSpikeModule({
  id: 'spikeRegA',
  bindings: ({ bind }) => {
    // Registry owner side: collect every contributed widget once all plugins have set up.
    bind(WidgetRegistry).toSelf();
    bind(OnStart).toResolvedValue(
      (registry: WidgetRegistry) => (container) =>
        container.getAll(RegAWidget, { optional: true }).forEach((w) => registry.register(w)),
      [WidgetRegistry]
    );

    // Contributor side: what A writes to extend B. No reference to B at all.
    bind(RegBWidget).toConstantValue({
      type: 'fromA',
      render: () => 'widget contributed by spikeRegA',
    });
    bind(Global).toConstantValue(RegBWidget);
  },
  probe: (container) => ({
    visibleContributions: container.getAll(RegAWidget, { optional: true }).map((w) => w.render()),
    registry: container.get(WidgetRegistry).list(),
  }),
});

export { pluginModule as module };
