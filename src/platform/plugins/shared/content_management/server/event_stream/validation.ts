/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Ajv from 'ajv/dist/2020';

const ajv = new Ajv({
  allErrors: false,
  strict: false,
  verbose: false,
});

const partialEventSchema = {
  type: 'object',
  required: ['predicate'],
  additionalProperties: false,
  properties: {
    subject: {
      type: 'array',
      nullable: false,
      minItems: 2,
      maxItems: 2,
      items: false,
      prefixItems: [
        {
          type: 'string',
          minLength: 1,
          maxLength: 64,
        },
        {
          type: 'string',
          maxLength: 255,
        },
      ],
    },
    predicate: {
      type: 'array',
      minItems: 1,
      maxItems: 2,
      items: false,
      nullable: false,
      prefixItems: [
        {
          type: 'string',
          minLength: 1,
          maxLength: 64,
        },
        {
          type: 'object',
          additionalProperties: true,
          minProperties: 1,
          maxProperties: 255,
        },
      ],
    },
    object: {
      type: 'array',
      nullable: false,
      minItems: 2,
      maxItems: 2,
      items: false,
      prefixItems: [
        {
          type: 'string',
          minLength: 1,
          maxLength: 64,
        },
        {
          type: 'string',
          maxLength: 255,
        },
      ],
    },
    time: {
      type: 'number',
      nullable: false,
      multipleOf: 1,
      // Just some sane limits so the number doesn't escape too far into the
      // future or past.
      minimum: 1600000000000, // Sep 2020
      maximum: 2600000000000, // May 2052
    },
    transaction: {
      type: 'string',
      nullable: false,
      minLength: 1,
      maxLength: 255,
    },
  },
};

export const partialEventValidator = ajv.compile(partialEventSchema);
