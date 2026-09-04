/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';

import { JOB_SAVED_OBJECT_TYPE } from '../common/constants';
import type { JobLastRun } from '../common/types';

export interface SaExampleJobAttributes {
  title: string;
  description?: string;
  lastRun?: JobLastRun;
}

const lastRunSchema = schema.object({
  at: schema.string(),
  you: schema.maybe(schema.any()),
  scoped: schema.maybe(schema.any()),
});

export const saExampleJobAttributesSchema = schema.object({
  title: schema.string(),
  description: schema.maybe(schema.string()),
  lastRun: schema.maybe(lastRunSchema),
});

export const saExampleJobType: SavedObjectsType<SaExampleJobAttributes> = {
  name: JOB_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      title: { type: 'keyword' },
    },
  },
  management: {
    importableAndExportable: true,
    visibleInManagement: true,
    getTitle(savedObject) {
      return savedObject.attributes.title;
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: saExampleJobAttributesSchema.extends({}, { unknowns: 'ignore' }),
        create: saExampleJobAttributesSchema,
      },
    },
  },
};
