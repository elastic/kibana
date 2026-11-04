/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  INVESTIGATION_ENTITY_FIELDS,
  MAX_INVESTIGATION_FIELD_CHARS,
  MAX_INVESTIGATION_TEXT_CHARS,
  type InvestigationEntityField,
  type InvestigationSeed,
} from './investigation_seed_schema';

/** Fixed 20-minute window centered on a single log document's timestamp. */
export const DOCUMENT_INVESTIGATION_HALF_WINDOW_MS = 10 * 60 * 1000;

export interface ExtractDocumentSeedParams {
  documentId?: string;
  flattened: Record<string, unknown>;
  timestamp?: unknown;
  dataViewId?: string;
  indexPattern?: string;
}

const OTEL_FIELD_FALLBACKS: Partial<Record<InvestigationEntityField, readonly string[]>> = {
  'service.name': ['attributes.service.name', 'resource.attributes.service.name', 'service_name'],
  'service.environment': [
    'attributes.service.environment',
    'resource.attributes.service.environment',
    'deployment.environment',
    'attributes.deployment.environment',
    'resource.attributes.deployment.environment',
  ],
  'host.name': ['attributes.host.name', 'resource.attributes.host.name'],
  'container.id': ['attributes.container.id', 'resource.attributes.container.id'],
  'trace.id': ['attributes.trace.id', 'resource.attributes.trace.id'],
};

const asBoundedField = (value: unknown): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed.length > 0 && trimmed.length <= MAX_INVESTIGATION_FIELD_CHARS
      ? trimmed
      : undefined;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const stringified = String(raw);
    return stringified.length <= MAX_INVESTIGATION_FIELD_CHARS ? stringified : undefined;
  }
  return undefined;
};

const asBoundedText = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_INVESTIGATION_TEXT_CHARS ? trimmed : undefined;
};

const parseTimestampMs = (value: unknown): number | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

/** Reads ECS and OpenTelemetry entity fields from a flattened document record. */
export const extractEntitiesFromDocument = (
  flattened: Record<string, unknown>
): InvestigationSeed['entities'] => {
  const entities: InvestigationSeed['entities'] = {};

  for (const field of INVESTIGATION_ENTITY_FIELDS) {
    const candidates = [field, ...(OTEL_FIELD_FALLBACKS[field] ?? [])];
    for (const candidate of candidates) {
      const value = asBoundedField(flattened[candidate]);
      if (value) {
        entities[field] = value;
        break;
      }
    }
  }

  return entities;
};

/**
 * Builds an `InvestigationSeed` for a Discover log document, using a fixed window
 * around the document's timestamp and the entity fields on the hit.
 */
export const extractDocumentSeed = ({
  documentId,
  flattened,
  timestamp,
  dataViewId,
  indexPattern,
}: ExtractDocumentSeedParams): InvestigationSeed | undefined => {
  const centerMs = parseTimestampMs(timestamp ?? flattened['@timestamp']);
  if (centerMs === undefined) {
    return undefined;
  }

  const boundedDocId = asBoundedField(documentId);
  const boundedDataViewId = asBoundedField(dataViewId);
  const boundedIndexPattern = asBoundedText(indexPattern);

  return {
    origin: {
      app: 'discover',
      surface: 'document',
      ...(boundedDocId ? { documentId: boundedDocId } : {}),
    },
    timeRange: {
      from: new Date(centerMs - DOCUMENT_INVESTIGATION_HALF_WINDOW_MS).toISOString(),
      to: new Date(centerMs + DOCUMENT_INVESTIGATION_HALF_WINDOW_MS).toISOString(),
    },
    filters: [],
    ...(boundedDataViewId ? { dataViewId: boundedDataViewId } : {}),
    ...(boundedIndexPattern ? { indexPattern: boundedIndexPattern } : {}),
    entities: extractEntitiesFromDocument(flattened),
  };
};
