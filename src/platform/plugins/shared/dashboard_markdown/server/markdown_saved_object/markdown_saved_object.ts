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
import type { SavedObjectsType } from '@kbn/core/server';
import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import { ANALYTICS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { APP_ICON, MARKDOWN_SAVED_OBJECT_TYPE } from '../../common/constants';
import type { MarkdownByValueState } from '../embeddable/schemas';

/**
 * Type used to enforce alignment with source zod `markdownByValueStateSchema`
 */
type MarkdownByValueStateCompat = {
  [K in keyof Required<MarkdownByValueState>]: Type<MarkdownByValueState[K]>;
};

/**
 * Temporary duplicate `@kbn/config-schema` needed for `SavedObjectsType` compatibility
 *
 * Use zod schema once https://github.com/elastic/kibana/pull/262683 is merged
 */
const markdownByValueStateSchema = schema.object({
  content: schema.string(),
  settings: schema.object({
    open_links_in_new_tab: schema.boolean({ defaultValue: true }),
  }),
  description: schema.maybe(schema.string()),
  hide_title: schema.maybe(schema.boolean()),
  title: schema.maybe(schema.string()),
  hide_border: schema.maybe(schema.boolean()),
} satisfies MarkdownByValueStateCompat);

const modelVersion1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    forwardCompatibility: markdownByValueStateSchema.extends({}, { unknowns: 'ignore' }),
    create: markdownByValueStateSchema,
  },
};

export const markdownSavedObjectType: SavedObjectsType = {
  name: MARKDOWN_SAVED_OBJECT_TYPE,
  indexPattern: ANALYTICS_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  management: {
    icon: APP_ICON,
    defaultSearchField: 'title',
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.title;
    },
  },
  modelVersions: {
    '1': modelVersion1,
  },
  mappings: {
    dynamic: false,
    properties: {
      title: { type: 'text' },
      description: { type: 'text' },
      content: {
        type: 'text',
        index: false,
      },
    },
  },
  migrations: () => {
    return {};
  },
};
