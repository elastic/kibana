/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { groupBy } from 'lodash';
import type { OpenAPISpec } from '../../input/load_oas';
import { isRecord } from '../is_record';
import { collectReachableComponents } from './collect_reachable_components';
import { extractRequestBodyConsumers } from './extract_request_body_consumers';
import type { RequestBodyConsumer, RequestBodyIndex } from './types';

export type { RequestBodyConsumer, RequestBodyIndex } from './types';

interface ConsumerEntry {
  componentName: string;
  consumer: RequestBodyConsumer;
}

const componentSchemasOf = (oas: OpenAPISpec): Record<string, unknown> =>
  isRecord(oas.components) && isRecord(oas.components.schemas) ? oas.components.schemas : {};

const reachableFromSchema = (
  schema: unknown,
  componentSchemas: Record<string, unknown>
): string[] => {
  const reachable = new Set<string>();
  collectReachableComponents(schema, new Set<string>(), reachable, componentSchemas);
  return [...reachable];
};

export const buildRequestBodyIndex = (oas: OpenAPISpec): RequestBodyIndex => {
  const componentSchemas = componentSchemasOf(oas);

  const consumerEntries: ConsumerEntry[] = extractRequestBodyConsumers(oas).flatMap(
    ({ schema, consumer }) =>
      reachableFromSchema(schema, componentSchemas).map((componentName) => ({
        componentName,
        consumer,
      }))
  );

  const grouped = groupBy(consumerEntries, (entry) => entry.componentName);
  return new Map(
    Object.entries(grouped).map(([componentName, entries]) => [
      componentName,
      entries.map((entry) => entry.consumer),
    ])
  );
};
