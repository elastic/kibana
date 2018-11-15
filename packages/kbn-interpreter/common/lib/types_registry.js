/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Registry } from './registry';
import { Type } from './type';

class TypesRegistry extends Registry {
  wrapper(obj) {
    return new Type(obj);
  }
}

export const typesRegistry = new TypesRegistry();
