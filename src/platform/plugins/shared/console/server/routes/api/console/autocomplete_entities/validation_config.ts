/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const autoCompleteEntitiesValidationConfig = {
  query: schema.object(
    {
      indices: schema.maybe(schema.boolean()),
      fields: schema.maybe(schema.boolean()),
      templates: schema.maybe(schema.boolean()),
      dataStreams: schema.maybe(schema.boolean()),
      /**
       * Comma separated list of indices for mappings retrieval.
       */
      fieldsIndices: schema.maybe(schema.string()),
    },
    {
      validate: (payload) => {
        if (Object.keys(payload).length === 0) {
          return 'The request must contain at least one of the following parameters: indices, fields, templates, dataStreams.';
        }
      },
    }
  ),
};

export type SettingsToRetrieve = TypeOf<typeof autoCompleteEntitiesValidationConfig.query>;
