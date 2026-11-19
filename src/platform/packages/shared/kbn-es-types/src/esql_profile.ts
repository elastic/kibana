/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { esqlProfileResponseSchema } from '@elastic/esql-definitions/profile-schema';
import type { FromSchema } from 'json-schema-to-ts';

/** Makes every property optional all the way down, for data that other versions fill differently. */
type DeepPartial<T> = T extends ReadonlyArray<infer Item>
  ? Array<DeepPartial<Item>>
  : T extends object
  ? { [Key in keyof T]?: DeepPartial<T[Key]> }
  : T;

/** What the schema describes, with every property optional. */
type ProfileFromSchema = DeepPartial<FromSchema<typeof esqlProfileResponseSchema>>;

type SchemaOperator = NonNullable<
  NonNullable<ProfileFromSchema['drivers']>[number]['operators']
>[number];

/**
 * One operator inside an ES|QL profile driver. Its `status` fields depend on the kind of operator,
 * and the readers look at them by name, so they are not narrowed here.
 */
type EsqlProfileOperator = Omit<SchemaOperator, 'operator' | 'status'> & {
  operator: string;
  status?: Record<string, unknown>;
};

/** One slice of ES|QL execution, usually one task on a node. */
export type EsqlProfileDriver = Omit<
  NonNullable<ProfileFromSchema['drivers']>[number],
  'operators'
> & { operators?: EsqlProfileOperator[] };

/** Physical plan text attached to an ES|QL profile. */
export type EsqlProfilePlan = NonNullable<ProfileFromSchema['plans']>[number];

/**
 * The `profile` object returned when an ES|QL query is run with `profile: true`. Its shape comes from
 * the JSON Schema that Elasticsearch publishes for it. Every property is optional, because the
 * profile is a debug payload that older and newer versions fill differently, and it is read without
 * being validated.
 */
export type EsqlQueryProfile = Omit<ProfileFromSchema, 'drivers'> & {
  drivers?: EsqlProfileDriver[];
};
