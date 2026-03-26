/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView, type FieldSpec } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { EVENT_FIELD_PREFIX } from '@kbn/workflows-extensions/common';
import type { z } from '@kbn/zod/v4';
import { getEventSchemaProperties } from '../../../trigger_hover/event_schema_properties';

/** Synthetic index title; no cluster index is required (allowNoIndex). */
export const WORKFLOW_TRIGGER_EVENT_KQL_STUB_TITLE = 'workflow-trigger-event-kql-stub';

/**
 * One stub {@link DataView} per trigger `eventSchema` instance (identity).
 */
const stubDataViewByEventSchema = new WeakMap<z.ZodType, DataView>();

function zodDisplayTypeToKbnFieldType(displayType: string): string {
  const lower = displayType.toLowerCase();
  if (lower === 'number' || lower === 'integer') return 'number';
  if (lower === 'boolean') return 'boolean';
  if (lower === 'date' || lower === 'datetime') return 'date';
  return 'string';
}

function kbnTypeToEsType(kbnType: string): string {
  if (kbnType === 'number') return 'long';
  if (kbnType === 'boolean') return 'boolean';
  if (kbnType === 'date') return 'date';
  return 'keyword';
}

/**
 * Builds Kibana {@link FieldSpec} entries for KQL autocomplete from a trigger payload Zod schema.
 * Field names use `event.<path>` (see {@link EVENT_FIELD_PREFIX}) to match `evaluateKql(..., { event })`.
 * Pure `object` container paths are omitted; nested scalars appear as dotted fields.
 */
export function eventSchemaPropertiesToFieldSpecs(
  eventSchema: z.ZodType,
  fieldPrefix: string = EVENT_FIELD_PREFIX
): FieldSpec[] {
  const props = getEventSchemaProperties(eventSchema).filter((prop) => prop.type !== 'object');
  const normalizedPrefix = fieldPrefix.endsWith('.') ? fieldPrefix : `${fieldPrefix}.`;

  return props.map((prop) => {
    const name = `${normalizedPrefix}${prop.name}`;
    const type = zodDisplayTypeToKbnFieldType(prop.type);
    const esType = kbnTypeToEsType(type);
    return {
      name,
      type,
      esTypes: [esType],
      scripted: false,
      searchable: true,
      aggregatable: false,
      readFromDocValues: true,
    } satisfies FieldSpec;
  });
}

/**
 * In-memory {@link DataView} for `kql.autocomplete.getQuerySuggestions` on trigger `on.condition`.
 *
 * @param fieldFormats — Registry from Kibana start services (`services.fieldFormats`).
 */
export function createStubDataViewForTriggerEventSchema(
  eventSchema: z.ZodType,
  fieldFormats: FieldFormatsStart,
  fieldPrefix: string = EVENT_FIELD_PREFIX
): DataView {
  const fieldList = eventSchemaPropertiesToFieldSpecs(eventSchema, fieldPrefix);
  const fields: Record<string, FieldSpec> = {};
  for (const spec of fieldList) {
    fields[spec.name] = spec;
  }

  return new DataView({
    spec: {
      title: WORKFLOW_TRIGGER_EVENT_KQL_STUB_TITLE,
      allowNoIndex: true,
      fields,
    },
    fieldFormats,
    metaFields: ['_id', '_type', '_source'],
  });
}

/**
 * Cached {@link createStubDataViewForTriggerEventSchema} for the same `eventSchema` reference.
 */
export function getOrCreateStubDataViewForTriggerEventSchema(
  eventSchema: z.ZodType,
  fieldFormats: FieldFormatsStart,
  fieldPrefix: string = EVENT_FIELD_PREFIX
): DataView {
  if (fieldPrefix !== EVENT_FIELD_PREFIX) {
    return createStubDataViewForTriggerEventSchema(eventSchema, fieldFormats, fieldPrefix);
  }

  let cached = stubDataViewByEventSchema.get(eventSchema);
  if (!cached) {
    cached = createStubDataViewForTriggerEventSchema(eventSchema, fieldFormats, fieldPrefix);
    stubDataViewByEventSchema.set(eventSchema, cached);
  }
  return cached;
}
