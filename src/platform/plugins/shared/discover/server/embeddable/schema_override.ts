/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import { BY_REF_SCHEMA_META, BY_VALUE_SCHEMA_META } from '@kbn/presentation-publishing-schemas';
import {
  classicTabSchema,
  discoverSessionByReferencePropsSchema,
  discoverSessionByValuePropsSchema,
  esqlTabSchema,
  getDiscoverSessionEmbeddableSchema as getCanonicalDiscoverSessionEmbeddableSchema,
  panelOverridesSchema,
  withPanelSchemas,
} from './schema';

/** Shared Zod mask for removing the JSON view fields. */
export const dataTableJsonViewFieldsToOmit = {
  documents_display_mode: true,
  json_mode_settings: true,
} as const;

const restrictedClassicTabSchema = classicTabSchema.omit(dataTableJsonViewFieldsToOmit);
const restrictedEsqlTabSchema = esqlTabSchema
  .omit(dataTableJsonViewFieldsToOmit)
  .meta(esqlTabSchema.meta() ?? {});
const restrictedTabSchema = z.union([restrictedClassicTabSchema, restrictedEsqlTabSchema]);
const restrictedPanelOverridesSchema = panelOverridesSchema
  .unwrap()
  .omit(dataTableJsonViewFieldsToOmit)
  .default({});

const createRestrictedDiscoverSessionEmbeddableSchema = () => {
  const byValuePropsSchema = discoverSessionByValuePropsSchema.extend({
    tabs: z.array(restrictedTabSchema).min(1).max(1).meta({
      description:
        'Inline tab configuration. Used when no `ref_id` is set. Currently supports one tab.',
    }),
  });
  const getByValueSchema = withPanelSchemas(byValuePropsSchema, BY_VALUE_SCHEMA_META);

  const byReferencePropsSchema = discoverSessionByReferencePropsSchema.extend({
    overrides: restrictedPanelOverridesSchema,
  });
  const getByReferenceSchema = withPanelSchemas(byReferencePropsSchema, BY_REF_SCHEMA_META);

  return (getDrilldownsSchema: GetDrilldownsSchemaFnType) =>
    z.union([getByValueSchema(getDrilldownsSchema), getByReferenceSchema(getDrilldownsSchema)]);
};

const getRestrictedDiscoverSessionEmbeddableSchema =
  createRestrictedDiscoverSessionEmbeddableSchema();

/** Selects the canonical schema or a feature-restricted variant. */
export const getDiscoverSessionEmbeddableSchema = ({
  dataTableJsonView,
}: {
  readonly dataTableJsonView: boolean;
}) =>
  dataTableJsonView
    ? getCanonicalDiscoverSessionEmbeddableSchema
    : getRestrictedDiscoverSessionEmbeddableSchema;
