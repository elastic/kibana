/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DrilldownSetup } from './types';

export function getDrilldownRegistry() {
  const registry: { [key: string]: DrilldownSetup } = {};

  return {
    registerDrilldown: (type: string, drilldown: DrilldownSetup) => {
      if (registry[type]) {
        throw new Error(`Drilldown for type "${type}" are already registered.`);
      }

      registry[type] = drilldown;
    },
    getTransformIn: (type: string) => {
      return registry[type]?.transformIn;
    },
    getTransformOut: (type: string) => {
      return registry[type]?.transformOut;
    },
    getSchemasForSupportedTriggers: (supportedTriggers: string[]) => {
      return Object.values(registry)
        .filter(({ supportedTriggers: drilldownSupportedTriggers }) => {
          return supportedTriggers.some((trigger) => drilldownSupportedTriggers.includes(trigger));
        })
        .map(({ schema }) => schema);
    },
  };
}
