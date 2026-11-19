/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import { esqlProfileResponseSchema } from '@elastic/esql-definitions/profile-schema';
import type { PlanningPhaseId } from './types';

/*
 * Things the profile view needs to know about the profile that Elasticsearch describes in its
 * published schema, read from it instead of being written out here.
 */

const schema = esqlProfileResponseSchema as unknown as JSONSchema7;

/** The object behind a property, whose schema is the object itself or a choice of it and null. */
const objectOf = (node: JSONSchema7 | boolean | undefined): JSONSchema7 => {
  if (!node || typeof node === 'boolean') {
    return {};
  }
  const [withProperties] = (node.anyOf ?? [node]).filter(
    (variant): variant is JSONSchema7 => typeof variant === 'object' && variant.type !== 'null'
  );
  return withProperties ?? {};
};

const propertiesOf = (node: JSONSchema7 | boolean | undefined): Record<string, JSONSchema7> =>
  (objectOf(node).properties ?? {}) as Record<string, JSONSchema7>;

const profileProperties = propertiesOf(schema);

/**
 * The planning phases, such as parsing and analysis, in the order the schema lists them, which is
 * the order they run in. They are the time spans of the profile other than `query` and `planning`,
 * which are their totals.
 */
export const PLANNING_PHASE_IDS: readonly PlanningPhaseId[] = Object.entries(profileProperties)
  .filter(
    ([name, property]) =>
      name !== 'query' && name !== 'planning' && propertiesOf(property).took_millis !== undefined
  )
  .map(([name]) => name as PlanningPhaseId);

const driver = objectOf(objectOf(profileProperties.drivers).items as JSONSchema7);
const operatorVariants =
  (objectOf(propertiesOf(driver).operators).items as JSONSchema7 | undefined)?.anyOf ?? [];

/** The fields that each kind of operator reports in its `status`. */
const operatorStatusFields: string[][] = operatorVariants.flatMap((variant) => {
  const status = propertiesOf(variant as JSONSchema7).status;
  return status
    ? ((status.anyOf ?? [status]) as JSONSchema7[]).map((kind) => Object.keys(propertiesOf(kind)))
    : [];
});

/** Most operators report the time they ran for in this field. */
export const PROCESS_NANOS_FIELD = 'process_nanos';

/**
 * Operators that report no `process_nanos` report their time in separate phases, such as hashing,
 * aggregating and emitting, which add up. These are the timing fields of those operators.
 */
export const PHASE_NANOS_FIELDS: readonly string[] = [
  ...new Set(
    operatorStatusFields
      .filter((fields) => !fields.includes(PROCESS_NANOS_FIELD))
      .flatMap((fields) => fields.filter((field) => field.endsWith('_nanos')))
  ),
];
