/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { set } from 'lodash';
import { EcsNestedSchema, GroupSchema } from './types';

export function buildSchema(spec: EcsNestedSchema) : GroupSchema {
  const json: GroupSchema = {};

  for (const [group, details] of Object.entries(spec)) {
    for (const [, field] of Object.entries(details.fields)) {
      var full_field_name = field.flat_name.split(".").slice(1);
      const name = group === 'base' ? `${field.flat_name}` : `${full_field_name.join(".")}`;
      set(json, `${group}.${name}`, field);
    }
  }
  return json;
}
