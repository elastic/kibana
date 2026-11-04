/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  DOCUMENT_INVESTIGATION_HALF_WINDOW_MS,
  extractDocumentSeed,
  extractEntitiesFromDocument,
} from './src/extract_document_seed';
export type { ExtractDocumentSeedParams } from './src/extract_document_seed';
export {
  extractEntitiesFromFilters,
  extractEntitiesFromKql,
  extractSeedEntities,
} from './src/extract_entities';
export {
  INVESTIGATION_ENTITY_FIELDS,
  MAX_INVESTIGATION_FIELD_CHARS,
  MAX_INVESTIGATION_FILTERS,
  MAX_INVESTIGATION_HOSTS,
  MAX_INVESTIGATION_TEXT_CHARS,
  investigationSeedSchema,
  isEsqlQuery,
  resolveInvestigationHosts,
} from './src/investigation_seed_schema';

export type { InvestigationEntityField, InvestigationSeed } from './src/investigation_seed_schema';
