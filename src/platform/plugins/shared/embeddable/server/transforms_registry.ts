/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ObjectType, Type } from '@kbn/config-schema';
import type { DrilldownTransforms, EmbeddableTransforms } from '../common';
import type { GetDrilldownsSchemaFnType } from './drilldowns/types';
import type { getDrilldownRegistry } from './drilldowns/registry';
import { getTransformDrilldownsIn } from '../common/drilldowns/transform_drilldowns_in';
import { getTransformDrilldownsOut } from '../common/drilldowns/transform_drilldowns_out';

export type EmbeddableTransformsSetup<
  StoredEmbeddableState extends object = object,
  EmbeddableState extends object = object
> = {
  getTransforms?: (
    drilldownTransforms: DrilldownTransforms
  ) => EmbeddableTransforms<StoredEmbeddableState, EmbeddableState>;
  /**
   * Embeddable containers that include embeddable state in REST APIs, such as dashboard,
   * use schemas to
   * 1) Include embeddable state schemas in OpenAPI Specification (OAS) documenation.
   * 2) Validate embeddable state, failing requests when schema validation fails.
   *
   * When schema is provided, EmbeddableState is expected to be TypeOf<typeof schema>
   */
  getSchema?: (getDrilldownsSchema: GetDrilldownsSchemaFnType) => Type<object> | undefined;
  /**
   * Throws error when panel config is not supported.
   */
  throwOnUnmappedPanel?: (config: EmbeddableState) => void;
};

export function getTranformsRegistry(drilldownRegistry: ReturnType<typeof getDrilldownRegistry>) {
  const transformsRegistry: { [key: string]: EmbeddableTransformsSetup<any, any> } = {};

  const drilldownTransforms = {
    transformIn: getTransformDrilldownsIn(drilldownRegistry.getTransformIn),
    transformOut: getTransformDrilldownsOut(drilldownRegistry.getTransformOut),
  };

  return {
    registerTransforms: (type: string, transforms: EmbeddableTransformsSetup<any, any>) => {
      if (transformsRegistry[type]) {
        throw new Error(`Embeddable transforms for type "${type}" are already registered.`);
      }

      transformsRegistry[type] = transforms;
    },
    getAllEmbeddableSchemas: () =>
      Object.values(transformsRegistry)
        .map((transformsSetup) =>
          transformsSetup?.getSchema?.(drilldownRegistry.getDrilldownsSchema)
        )
        .filter((schema) => Boolean(schema)) as ObjectType[],
    getEmbeddableTransforms: (type: string) => {
      const transformsSetup = transformsRegistry[type];
      return transformsSetup
        ? {
            ...transformsSetup.getTransforms?.(drilldownTransforms),
            ...(transformsSetup.getSchema
              ? { schema: transformsSetup.getSchema(drilldownRegistry.getDrilldownsSchema) }
              : {}),
            ...(typeof transformsSetup.throwOnUnmappedPanel === 'boolean'
              ? { throwOnUnmappedPanel: transformsSetup.throwOnUnmappedPanel }
              : {}),
          }
        : undefined;
    },
  };
}
