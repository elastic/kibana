/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
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
        .map(([type, drilldownSetup]) =>
          drilldownSetup.schema.extends({
            label: schema.string(),
            trigger: schema.oneOf(
              drilldownSetup.supportedTriggers
                // narrow drilldown triggers to only those that intersect with supported triggers
                .filter((trigger) => supportedTriggers.includes(trigger))
                .map((trigger) => schema.literal(trigger)) as [Type<string>]
            ),
            type: schema.literal(type),
          })
        );

      return schema.object({
        drilldowns: schema.maybe(
          schema.arrayOf(
            schema.oneOf(
              drilldownSchemas as unknown as [
                Type<Readonly<{} & { label: string; type: string; trigger: string }>>
              ]
            ),
            {
              // 100 is an arbitrary limit
              maxSize: 100,
            }
          )
        ),
      });
    },
  };
}
