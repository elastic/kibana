/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPlainObjectType } from './is_plain_object_type';

export function hasProp<Property extends string, Value = string | number | boolean>(
  node: unknown,
  propName: Property,
  propValue?: Value
): node is { [key in Property]: Value } & Record<string, unknown> {
  if (!isPlainObjectType(node) || !(propName in node)) {
    return false;
  }

  return propValue ? node[propName] === propValue : Boolean(node[propName]);
}
