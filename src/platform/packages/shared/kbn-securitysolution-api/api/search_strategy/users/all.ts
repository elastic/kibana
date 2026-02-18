/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { UsersQueries } from '../model/factory_query_type';
import { requestOptionsPaginatedSchema } from '../model/request_paginated_options';
import { sort } from '../model/sort';
import { timerange } from '../model/timerange';

export enum UsersFields {
  name = 'name',
  domain = 'domain',
  lastSeen = 'lastSeen',
}

export const usersSchema = requestOptionsPaginatedSchema.extend({
  sort: sort.removeDefault().extend({
    field: z.enum([UsersFields.name, UsersFields.lastSeen]),
  }),
  timerange,
  factoryQueryType: z.literal(UsersQueries.users),
});

export type UsersRequestOptionsInput = z.input<typeof usersSchema>;

export type UsersRequestOptions = z.infer<typeof usersSchema>;
