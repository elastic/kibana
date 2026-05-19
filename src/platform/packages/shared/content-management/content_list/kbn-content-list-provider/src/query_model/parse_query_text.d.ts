/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListQueryModel, FieldDefinition, FlagDefinition } from './types';
/** Build an EUI schema from field definitions. */
export declare const buildSchema: (fields: ReadonlyArray<FieldDefinition>) =>
  | {
      strict: false;
      fields: Record<
        string,
        {
          type: 'string';
        }
      >;
    }
  | undefined;
/** Parse `queryText` into a {@link ContentListQueryModel}. */
export declare const parseQueryText: (
  queryText: string,
  fields: ReadonlyArray<FieldDefinition>,
  flags: ReadonlyArray<FlagDefinition>,
  schema: ReturnType<typeof buildSchema>
) => ContentListQueryModel;
