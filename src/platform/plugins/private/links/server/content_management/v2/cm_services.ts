/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { createResultSchema, objectTypeToGetResultSchema } from '@kbn/content-management-utils';
import type {
  ContentManagementServicesDefinition as ServicesDefinition,
  VersionableObject,
} from '@kbn/object-versioning';
import type { SavedObjectReference } from '@kbn/core/server';
import type { LinksByValueSerializedState } from './types';
import { cmServiceDefinition as cmServiceDefinitionV1 } from '../v1/cm_services';
import {
  dashboardLinkSchema as dashboardLinkSchemaV1,
  externalLinkSchema,
  savedObjectLinksAttributesSchema as linksAttributesSchemaV1,
  type LinksByValueSerializedState as LinksByValueSerializedStateV1,
} from '../v1';
import { extractReferences } from './in/extract_references';

const dashboardLinkSchema = dashboardLinkSchemaV1.extends({
  // remove destinationRefName by setting it to undefined
  destinationRefName: undefined,
  destination: schema.string(),
});

export const linksAttributesSchema = linksAttributesSchemaV1.extends({
  links: schema.arrayOf(schema.oneOf([dashboardLinkSchema, externalLinkSchema])),
});

export const cmServiceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: objectTypeToGetResultSchema(linksAttributesSchema),
        down: (data) => {
          // TODO extract references...
          return data;
        },
      },
    },
  },
  create: {
    in: {
      ...cmServiceDefinitionV1?.create?.in,
      data: {
        schema: linksAttributesSchema,
        down: (data) => {
          // TODO inject references...
          return data;
        },
      },
    },
    out: {
      result: {
        schema: createResultSchema(linksAttributesSchema),
      },
    },
  },
  update: {
    in: {
      ...cmServiceDefinitionV1.update?.in,
      data: {
        schema: linksAttributesSchema,
      },
    },
  },
  search: {
    in: cmServiceDefinitionV1.search?.in,
  },
  mSearch: {
    out: {
      result: {
        schema: linksAttributesSchema,
      },
    },
  },
};

export const embeddableVersionableObject: VersionableObject<
  unknown,
  unknown,
  LinksByValueSerializedState,
  { attributes: LinksByValueSerializedStateV1; references?: SavedObjectReference[] }
> = {
  schema: linksAttributesSchema,
  down: (state) => {
    return extractReferences({ attributes: state.attributes });
  },
};
