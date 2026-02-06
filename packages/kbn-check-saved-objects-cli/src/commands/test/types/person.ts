/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectModelDataBackfillFn,
  SavedObjectsType,
} from '@kbn/core-saved-objects-server';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

const personSchemaV1 = schema.object({
  firstName: schema.string(),
  lastName: schema.string(),
});

const personSchemaV2 = personSchemaV1.extends({
  fullName: schema.string(),
});

type PersonV1 = TypeOf<typeof personSchemaV1>;
type PersonV2 = TypeOf<typeof personSchemaV2>;

const fullNameBackfill: SavedObjectModelDataBackfillFn<PersonV1, PersonV2> = (doc) => {
  return {
    attributes: {
      fullName: `${doc.attributes.firstName} ${doc.attributes.lastName}`,
    },
  };
};

export const PERSON_SO_TYPE: Partial<SavedObjectsType> = {
  name: 'person-so-type',
  mappings: {
    dynamic: false,
    properties: {
      firstName: { type: 'text' },
      lastName: { type: 'text' },
      fullName: { type: 'text' },
    },
  },
  modelVersions: {
    1: {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            firstName: { type: 'text' },
            lastName: { type: 'text' },
          },
        },
      ],
      schemas: {
        forwardCompatibility: personSchemaV1.extends({}, { unknowns: 'ignore' }),
        create: personSchemaV1,
      },
    },
    2: {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            fullName: { type: 'text' },
          },
        },
        {
          type: 'data_backfill',
          backfillFn: fullNameBackfill,
        },
      ],
      schemas: {
        forwardCompatibility: personSchemaV2.extends({}, { unknowns: 'ignore' }),
        create: personSchemaV2,
      },
    },
  },
};
