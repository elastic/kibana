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
import {
  PHASE_NANOS_FIELDS,
  PLANNING_PHASE_IDS,
  PROCESS_NANOS_FIELD,
} from './aggregate_esql_profile';

/**
 * The profile is read by field name, and the types only check the names above the operators. These
 * tests hold the rest against the schema that Elasticsearch publishes for the profile. When one
 * fails after the package is updated, Elasticsearch changed or added a field: decide whether the
 * profile view should read it, then update the readers.
 */

const schema = esqlProfileResponseSchema as unknown as JSONSchema7;

/** The object behind a property, whose schema is either the object or the object or null. */
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

  it('has the profile, driver, sleep and plan fields the view reads', () => {
    const top = propertiesOf(schema);
    const sleeps = propertiesOf(propertiesOf(driver).sleeps);
    const sleepItem = propertiesOf(objectOf(sleeps.first).items as JSONSchema7);
    const plan = propertiesOf(objectOf(top.plans).items as JSONSchema7);

    expect(
      ['query', 'planning', 'drivers', 'plans', ...PLANNING_PHASE_IDS].filter((f) => !(f in top))
    ).toEqual([]);
    expect(Object.keys(propertiesOf(top.query))).toEqual(
      expect.arrayContaining(['took_millis', 'start_millis', 'stop_millis'])
    );
    expect(Object.keys(propertiesOf(driver))).toEqual(
      expect.arrayContaining([
        'description',
        'node_name',
        'operators',
        'sleeps',
        'start_millis',
        'stop_millis',
        'took_nanos',
        'cpu_nanos',
      ])
    );
    expect(Object.keys(sleeps)).toEqual(expect.arrayContaining(['counts', 'first', 'last']));
    expect(Object.keys(sleepItem)).toEqual(
      expect.arrayContaining(['reason', 'sleep_millis', 'wake_millis'])
    );
    expect(Object.keys(plan)).toEqual(expect.arrayContaining(['description', 'node_name', 'plan']));
  });
});
