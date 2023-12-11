/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { getBaseMappings } from './build_active_mappings';

export const buildPickupMappingsQuery = (
  updatedFields: string[]
): QueryDslQueryContainer | undefined => {
  const rootFields = Object.keys(getBaseMappings().properties);

  if (updatedFields.some((field) => rootFields.includes(field))) {
    // we are updating some root fields, update ALL documents (no filter query)
    return undefined;
  }

  // at this point, all updated fields correspond to SO types
  const updatedTypes = updatedFields;

  return {
    bool: {
      should: updatedTypes.map((type) => ({ term: { type } })),
    },
  };
};
