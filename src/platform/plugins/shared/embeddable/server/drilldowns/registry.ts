/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DrilldownSetup } from './types';

export class DrilldownRegistry {
  private registry: { [key: string]: DrilldownSetup } = {};

  registerDrilldown(type: string, drilldown: DrilldownSetup) {
    if (this.registry[type]) {
      throw new Error(`Drilldown for type "${type}" are already registered.`);
    }

    this.registry[type] = drilldown;
  }

  getDrilldown(type: string) {
    return this.registry[type];
  }

  getSchemas(embeddableSupportedTriggers: string[]) {
    return Object.values(this.registry)
      .filter(({ supportedTriggers: drilldownSupportedTriggers }) => {
        return embeddableSupportedTriggers.some((trigger) =>
          drilldownSupportedTriggers.includes(trigger)
        );
      })
      .map(({ schema }) => schema);
  }
}
