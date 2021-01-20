/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IndexMapping } from '../types';

/**
 *  Get the names of the types defined in the EsMappingsDsl
 */
export function getTypes(mappings: IndexMapping) {
  return Object.keys(mappings).filter((type) => type !== '_default_');
}
