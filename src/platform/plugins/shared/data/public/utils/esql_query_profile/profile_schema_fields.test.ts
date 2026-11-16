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
import { PHASE_NANOS_FIELDS, PROCESS_NANOS_FIELD } from './aggregate_esql_profile';

/**
 * The profile types come from the schema, so the names above the operators are checked when the code
 * compiles. The `status` of an operator is read by name without types, so these tests hold those
 * names against the schema that Elasticsearch publishes for the profile. When one
 * fails after the package is updated, Elasticsearch changed or added a field: decide whether the
 * profile view should read it, then update the readers.
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

const driver = objectOf(objectOf(propertiesOf(schema).drivers).items as JSONSchema7);
const operatorVariants =
  (objectOf(propertiesOf(driver).operators).items as JSONSchema7).anyOf ?? [];

/** The `status` shape of every kind of operator the schema lists. */
const statuses: JSONSchema7[] = operatorVariants.flatMap((variant) => {
  const status = propertiesOf(variant as JSONSchema7).status;
  return status ? ((status.anyOf ?? [status]) as JSONSchema7[]) : [];
});

const describeStatus = (status: JSONSchema7): string =>
  Object.keys(propertiesOf(status)).slice(0, 4).join(', ');

describe('the ES|QL profile schema and the profile readers', () => {
  it('lists the kinds of operator, so the other tests have something to check', () => {
    expect(statuses.length).toBeGreaterThan(10);
  });

  it('only has timing fields we count on operators that report no process time', () => {
    const missed = statuses
      .filter((status) => !(PROCESS_NANOS_FIELD in propertiesOf(status)))
      .flatMap((status) =>
        Object.keys(propertiesOf(status))
          .filter((field) => field.endsWith('_nanos') && !PHASE_NANOS_FIELDS.includes(field))
          .map((field) => `${field} (operator with ${describeStatus(status)})`)
      );

    expect(missed).toEqual([]);
  });

  it('still has every timing field we read, so a rename does not leave us reading nothing', () => {
    const reported = new Set(statuses.flatMap((status) => Object.keys(propertiesOf(status))));

    expect([PROCESS_NANOS_FIELD, ...PHASE_NANOS_FIELDS].filter((f) => !reported.has(f))).toEqual(
      []
    );
    expect(['rows_received', 'rows_emitted'].filter((f) => !reported.has(f))).toEqual([]);
  });
});
