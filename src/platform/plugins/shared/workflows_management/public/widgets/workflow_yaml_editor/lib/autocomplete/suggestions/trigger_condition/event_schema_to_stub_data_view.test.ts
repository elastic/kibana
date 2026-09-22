/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isFilterable } from '@kbn/data-views-plugin/common';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { z } from '@kbn/zod/v4';
import {
  createStubDataViewForTriggerEventSchema,
  eventSchemaPropertiesToFieldSpecs,
  getOrCreateStubDataViewForTriggerEventSchema,
  WORKFLOW_TRIGGER_EVENT_KQL_STUB_TITLE,
} from './event_schema_to_stub_data_view';

describe('event_schema_to_stub_data_view', () => {
  const eventSchema = z.object({
    severity: z.string(),
    count: z.number(),
    nested: z.object({
      flag: z.boolean(),
    }),
  });

  it('eventSchemaPropertiesToFieldSpecs prefixes event. and skips object containers', () => {
    const specs = eventSchemaPropertiesToFieldSpecs(eventSchema);
    const names = specs.map((s) => s.name).sort();
    expect(names).toEqual(['event.count', 'event.nested.flag', 'event.severity']);
    const severity = specs.find((s) => s.name === 'event.severity');
    expect(severity).toMatchObject({ type: 'string', searchable: true, aggregatable: false });
    const count = specs.find((s) => s.name === 'event.count');
    expect(count).toMatchObject({ type: 'number', esTypes: ['long'] });
    const flag = specs.find((s) => s.name === 'event.nested.flag');
    expect(flag).toMatchObject({ type: 'boolean', esTypes: ['boolean'] });
  });

  it('createStubDataViewForTriggerEventSchema yields filterable fields for KQL suggestions', () => {
    const dataView = createStubDataViewForTriggerEventSchema(
      eventSchema,
      fieldFormatsServiceMock.createStartContract()
    );
    expect(dataView.getIndexPattern()).toBe(WORKFLOW_TRIGGER_EVENT_KQL_STUB_TITLE);
    const severityField = dataView.fields.find((f) => f.name === 'event.severity');
    expect(severityField).toBeDefined();
    expect(isFilterable(severityField!)).toBe(true);
  });

  it('eventSchemaPropertiesToFieldSpecs includes array-of-object nested paths as event.* fields', () => {
    const schema = z.object({
      items: z.array(
        z.object({
          id: z.string(),
        })
      ),
    });
    const names = eventSchemaPropertiesToFieldSpecs(schema)
      .map((s) => s.name)
      .sort();
    expect(names).toEqual(['event.items.id']);
  });

  it('getOrCreateStubDataViewForTriggerEventSchema returns the same DataView for the same schema reference', () => {
    const fieldFormats = fieldFormatsServiceMock.createStartContract();
    const first = getOrCreateStubDataViewForTriggerEventSchema(eventSchema, fieldFormats);
    const second = getOrCreateStubDataViewForTriggerEventSchema(eventSchema, fieldFormats);
    expect(second).toBe(first);

    const otherSchema = z.object({ other: z.string() });
    const otherView = getOrCreateStubDataViewForTriggerEventSchema(otherSchema, fieldFormats);
    expect(otherView).not.toBe(first);
  });
});
