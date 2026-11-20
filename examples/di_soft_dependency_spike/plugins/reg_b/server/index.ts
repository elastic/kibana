/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Option B, plugin B: owns its own widget registry and contributes a widget to A's.
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
  id: 'spikeRegB',
  bindings: ({ bind }) => {
    bind(WidgetRegistry).toSelf();
    bind(OnStart).toResolvedValue(
      (registry: WidgetRegistry) => (container) =>
        container.getAll(RegBWidget, { optional: true }).forEach((w) => registry.register(w)),
      [WidgetRegistry]
    );

    bind(RegAWidget).toConstantValue({
      type: 'fromB',
      render: () => 'widget contributed by spikeRegB',
    });
    bind(Global).toConstantValue(RegAWidget);
  },
  probe: (container) => ({
    visibleContributions: container.getAll(RegBWidget, { optional: true }).map((w) => w.render()),
    registry: container.get(WidgetRegistry).list(),
  }),
});

export { pluginModule as module };
