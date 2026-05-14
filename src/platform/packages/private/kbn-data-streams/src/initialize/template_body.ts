/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type api from '@elastic/elasticsearch/lib/api/types';
import type { AnyDataStreamDefinition } from '../types';

/**
 * Body shape shared by `putIndexTemplate` and the inline form of `simulateTemplate`.
 *
 * The helper returns the body without `name` so the same value can be:
 * - spread into `putIndexTemplate({ name, ...body })`
 * - passed directly to `simulateTemplate(body)` (inline form, no name => no named lookup).
 */
export type IndexTemplateBody = Omit<api.IndicesPutIndexTemplateRequest, 'name'>;

/**
 * Build the `putIndexTemplate` / inline `simulateTemplate` body for a data stream definition.
 *
 * Used by both call sites so the body that is simulated cannot drift from the body that is later
 * installed: a single source of truth for `template.mappings`, `template.settings`,
 * `template.aliases`, `template.lifecycle`, `composed_of`, `priority`, `index_patterns`,
 * `data_stream.hidden`, and `_meta`.
 *
 * Caller is expected to have applied `applyDefaults` to `dataStream` already (so defaults like
 * `priority`, `hidden`, the system `kibana.space_ids` mapping, etc. are present).
 */
export const buildIndexTemplateBody = (
  dataStream: AnyDataStreamDefinition,
  previousVersions: number[]
): IndexTemplateBody => ({
  priority: dataStream.template.priority,
  index_patterns: [`${dataStream.name}*`],
  composed_of: dataStream.template.composedOf,
  data_stream: {
    hidden: dataStream.hidden,
  },
  template: {
    aliases: dataStream.template.aliases,
    mappings: dataStream.template.mappings,
    lifecycle: dataStream.template.lifecycle,
    settings: dataStream.template.settings,
  },
  _meta: {
    ...dataStream.template._meta,
    version: dataStream.version,
    previousVersions,
  },
});
