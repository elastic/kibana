/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import {
  PRIMITIVE_RUNTIME_FIELD_TYPES,
  RUNTIME_FIELD_COMPOSITE_TYPE,
} from '@kbn/data-views-plugin/common';

const MAX_NAME_LENGTH = 1000;

/**
 * Both composite and primitive runtime fields share the same base - name and script.
 */
const commonRuntimeFieldSchema = {
  /**
   * The name of the runtime field.
   * Example: 'my_runtime_field'
   */
  name: schema.string({
    minLength: 1,
    maxLength: MAX_NAME_LENGTH,
    meta: {
      id: 'kbn-runtime-field-name',
      title: 'Name',
      description: 'The name of the runtime field. Example: "my_runtime_field".',
    },
  }),
  /**
   * The script that defines the runtime field. This should be a painless script that computes the field value at query time.
   * Example: 'emit(doc["field_name"].value * 2);'
   */
  script: schema.maybe(
    schema.string({
      minLength: 1,
      meta: {
        id: 'kbn-runtime-field-script',
        title: 'Script',
        description:
          "The script that defines the runtime field. This should be a painless script that computes the field value at query time. Runtime fields without a script retrieve values from _source. If the field doesn't exist in _source, a search request returns no value.",
      },
    })
  ),
};

/**
 * The field definition is applicable for both top level fields in a primitive runtime field and subfields in a composite runtime field.
 */
const commonFieldSchema = {
  /**
   * The type of the runtime field (e.g., 'keyword', 'long', 'date').
   * Example: 'keyword'
   */
  type: schema.oneOf(
    PRIMITIVE_RUNTIME_FIELD_TYPES.map((type) => schema.literal(type)) as [
      Type<(typeof PRIMITIVE_RUNTIME_FIELD_TYPES)[number]>
    ],
    {
      meta: {
        id: 'kbn-runtime-field-type',
        title: 'Type',
        description: 'The type of the runtime field (e.g., "keyword", "long", "date").',
      },
    }
  ),
  /**
   * Optional format definition for the runtime field. The structure depends on the field type and use case.
   * If not provided, no format is applied.
   */
  format: schema.maybe(
    schema.object(
      {
        type: schema.string(),
        params: schema.any(),
      },
      {
        meta: {
          id: 'kbn-runtime-field-format',
          title: 'Format',
          description:
            'Set your preferred format for displaying the value. Changing the format can affect the value and prevent highlighting in Discover.',
        },
      }
    )
  ),
  custom_label: schema.maybe(
    schema.string({
      minLength: 1,
      meta: {
        id: 'kbn-runtime-field-custom-label',
        title: 'Custom label',
        description:
          'Create a label to display in place of the field name in Discover, Maps, Lens, Visualize, and TSVB. Useful for shortening a long field name. Queries and filters use the original field name.',
      },
    })
  ),
  custom_description: schema.maybe(
    schema.string({
      minLength: 1,
      meta: {
        id: 'kbn-runtime-field-custom-description',
        title: 'Custom description',
        description:
          "Add a description to the field. It's displayed next to the field on the Discover, Lens, and Data View Management pages.",
      },
    })
  ),
};

export const primitiveRuntimeFieldSchema = schema.object(
  {
    ...commonFieldSchema,
    ...commonRuntimeFieldSchema,
  },
  { meta: { id: 'kbn-runtime-field-schema', title: 'Runtime field' } }
);

export const compositeRuntimeFieldSchema = schema.object(
  {
    type: schema.literal(RUNTIME_FIELD_COMPOSITE_TYPE),
    fields: schema.arrayOf(
      schema.object({
        /**
         * The name of the subfield.
         * If the name is "field" and this subname is "name" the full name of the subfield will be "field.name".
         */
        name: schema.string({
          minLength: 1,
          maxLength: MAX_NAME_LENGTH,
          meta: {
            description:
              'The name of the runtime subfield, it gets appended to the parent field name. Example: "parent_name.my_runtime_subfield".',
          },
        }),
        ...commonFieldSchema,
      }),
      { maxSize: 100 }
    ),
    ...commonRuntimeFieldSchema,
  },
  { meta: { id: 'kbn-composite-runtime-field-schema', title: 'Composite runtime field' } }
);

export const runtimeFieldSchema = schema.discriminatedUnion('type', [
  primitiveRuntimeFieldSchema,
  compositeRuntimeFieldSchema,
]);
