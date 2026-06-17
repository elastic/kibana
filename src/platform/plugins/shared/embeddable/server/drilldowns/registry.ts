/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { smartIntersectionWith, z } from '@kbn/zod';
import type { DrilldownSetup } from './types';
import { getTransformDrilldownsIn } from '../../common/drilldowns/transform_drilldowns_in';
import { getTransformDrilldownsOut } from '../../common/drilldowns/transform_drilldowns_out';

export function getDrilldownRegistry() {
  const registry: { [key: string]: DrilldownSetup } = {};

  function getTransformIn(type: string) {
    return registry[type]?.transformIn;
  }

  function getTransformOut(type: string) {
    return registry[type]?.transformOut;
  }

  return {
    registerDrilldown: (type: string, drilldown: DrilldownSetup) => {
      if (registry[type]) {
        throw new Error(`Drilldown for type "${type}" are already registered.`);
      }

      registry[type] = drilldown;
    },
    transforms: {
      transformIn: getTransformDrilldownsIn(getTransformIn),
      transformOut: getTransformDrilldownsOut(getTransformOut),
    },
    getSchema: (supportedTriggers: string[]) => {
      const drilldownSchemas = Object.entries(registry)
        // narrow drilldowns to only those that intersect with supported triggers
        .filter(([type, drilldownSetup]) => {
          return supportedTriggers.some((trigger) =>
            drilldownSetup.supportedTriggers.includes(trigger)
          );
        })
        // sort to ensure consistent order in OAS documenation
        .sort(([aType], [bType]) => aType.localeCompare(bType))
        .map(([type, drilldownSetup]) =>
          smartIntersectionWith(drilldownSetup.schema, {
            label: z.string(),
            trigger: z.union(
              drilldownSetup.supportedTriggers
                // narrow drilldown triggers to only those that intersect with supported triggers
                .filter((trigger) => supportedTriggers.includes(trigger))
                // sort to ensure consistent order in OAS documenation
                .sort()
                .map((trigger) => z.literal(trigger))
            ),
            type: z.literal(type),
          }).meta({ title: type })
        );

      if (drilldownSchemas.length === 0) {
        throw new Error(
          'Supported triggers do not intersect with registered drilldowns. Remove drilldown schema from your embeddable schema.'
        );
      }

      return z
        .object({
          drilldowns: z.array(z.union(drilldownSchemas)).max(100).optional(),
        })
        .strict();
    },
  };
}
