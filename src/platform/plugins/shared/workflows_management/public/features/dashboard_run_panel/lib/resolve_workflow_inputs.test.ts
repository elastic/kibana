/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import type { Filter } from '@kbn/es-query';
import { buildFieldsZodValidator } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import { normalizeFieldsToJsonSchema } from '@kbn/workflows/spec/lib/field_conversion';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { describeWorkflowInputs, getAllowedMappingSources } from './describe_workflow_inputs';
import type { DashboardRunContext } from './resolve_workflow_inputs';
import { resolveWorkflowInputs } from './resolve_workflow_inputs';

const inputs: JsonModelSchemaType = {
  properties: {
    window: { $ref: '#/kibana/definitions/dashboardTimeRange' },
    scope: { $ref: '#/kibana/definitions/dashboardQuery' },
    host: { type: 'string', title: 'Host' },
    hosts: { type: 'array', items: { type: 'string' } },
    bytes: { type: 'array', items: { type: 'number' } },
    severity: { type: 'string', enum: ['low', 'high'] },
    limit: { type: 'integer' },
    since: { type: 'string', format: 'date-time' },
    day: { type: 'string', format: 'date' },
    dryRun: { type: 'boolean' },
    options: { type: 'object' },
  },
  required: ['window', 'host'],
};

const descriptors = describeWorkflowInputs(inputs);
const now = new Date('2026-11-15T12:00:00.000Z');

const hostFilter: Filter = {
  meta: { key: 'host.name', type: 'phrase', params: { query: 'web-1' } },
  query: { match_phrase: { 'host.name': 'web-1' } },
};

const context: DashboardRunContext = {
  timeRange: { from: 'now-15m', to: 'now' },
  query: { language: 'kuery', query: 'service.name : "payments"' },
  filters: [hostFilter],
  controls: [
    { id: 'one', label: 'Host', values: ['web-1'], isRange: false, mode: 'include' },
    { id: 'many', label: 'Hosts', values: ['web-1', 'web-2'], isRange: false, mode: 'include' },
    { id: 'none', label: 'Empty', values: [], isRange: false, mode: 'include' },
    { id: 'range', label: 'Bytes', values: ['10', '500'], isRange: true, mode: 'include' },
    { id: 'open_range', label: 'Open', values: ['', ''], isRange: true, mode: 'include' },
    { id: 'excluded', label: 'Not host', values: ['web-1'], isRange: false, mode: 'exclude' },
    { id: 'excluded_none', label: 'Not host', values: [], isRange: false, mode: 'exclude' },
    { id: 'exists', label: 'Any host', values: [], isRange: false, mode: 'exists' },
  ],
};

const resolve = (
  mappings: Parameters<typeof resolveWorkflowInputs>[1],
  overrides: Partial<DashboardRunContext> = {}
) => resolveWorkflowInputs(descriptors, mappings, { ...context, ...overrides }, { now });

describe('describeWorkflowInputs', () => {
  it('recognizes the dashboard definitions and classifies plain inputs', () => {
    const kinds = Object.fromEntries(descriptors.map(({ name, kind }) => [name, kind]));
    expect(kinds).toEqual({
      window: 'time_range',
      scope: 'query',
      host: 'string',
      hosts: 'array',
      bytes: 'array',
      severity: 'enum',
      limit: 'integer',
      since: 'date_time',
      day: 'date',
      dryRun: 'boolean',
      options: 'object',
    });
    expect(descriptors.find(({ name }) => name === 'host')).toMatchObject({
      label: 'Host',
      required: true,
    });
  });

  it('describes legacy array-format inputs after normalization', () => {
    const legacy = normalizeFieldsToJsonSchema([
      { name: 'env', type: 'choice', options: ['dev', 'prod'], required: true },
      { name: 'count', type: 'number' },
      { name: 'tags', type: 'array' },
    ]);
    const described = describeWorkflowInputs(legacy);
    expect(described).toEqual([
      expect.objectContaining({ name: 'env', kind: 'enum', enumValues: ['dev', 'prod'] }),
      expect.objectContaining({ name: 'count', kind: 'number' }),
      expect.objectContaining({ name: 'tags', kind: 'array', itemKind: 'string' }),
    ]);
    expect(getAllowedMappingSources(described[2])).toEqual(['control', 'constant']);
  });

  it('offers only the sources that can fill each kind of input', () => {
    const sources = Object.fromEntries(
      descriptors.map((descriptor) => [descriptor.name, getAllowedMappingSources(descriptor)])
    );
    expect(sources.window).toEqual(['time_range']);
    expect(sources.scope).toEqual(['query']);
    expect(sources.since).toEqual(['time_range', 'constant']);
    expect(sources.dryRun).toEqual(['constant']);
    expect(sources.options).toEqual([]);
    expect(sources.hosts).toEqual(['control', 'constant']);
  });
});

describe('resolveWorkflowInputs', () => {
  it('passes a single control selection to a string input', () => {
    expect(resolve([{ input: 'host', source: 'control', control_id: 'one' }])).toEqual({
      values: { host: 'web-1' },
      issues: [],
    });
  });

  it('passes every selected option to an array input', () => {
    expect(resolve([{ input: 'hosts', source: 'control', control_id: 'many' }]).values).toEqual({
      hosts: ['web-1', 'web-2'],
    });
  });

  it('reports several selections for an input that takes one', () => {
    const { values, issues } = resolve([{ input: 'host', source: 'control', control_id: 'many' }]);
    expect(values).toEqual({});
    expect(issues).toEqual([{ input: 'host', message: expect.stringContaining('2 values') }]);
  });

  it('leaves the input for the viewer when the control has no selection', () => {
    expect(
      resolve([
        { input: 'host', source: 'control', control_id: 'none' },
        { input: 'bytes', source: 'control', control_id: 'open_range' },
        { input: 'hosts', source: 'control', control_id: 'excluded_none' },
      ])
    ).toEqual({ values: {}, issues: [] });
  });

  it('does not pass an excluded or exists selection as the input value', () => {
    const { values, issues } = resolve([
      { input: 'host', source: 'control', control_id: 'excluded' },
      { input: 'hosts', source: 'control', control_id: 'exists' },
    ]);
    expect(values).toEqual({});
    expect(issues).toEqual([
      { input: 'host', message: expect.stringContaining('excludes its selection') },
      { input: 'hosts', message: expect.stringContaining('matches any value') },
    ]);
  });

  it('passes a range slider as numbers to a numeric array input', () => {
    expect(resolve([{ input: 'bytes', source: 'control', control_id: 'range' }]).values).toEqual({
      bytes: [10, 500],
    });
  });

  it('reports a control that was removed from the dashboard', () => {
    expect(resolve([{ input: 'host', source: 'control', control_id: 'gone' }]).issues).toEqual([
      { input: 'host', message: expect.stringContaining('no longer on the dashboard') },
    ]);
  });

  it('resolves the relative time range to UTC timestamps at run time', () => {
    expect(resolve([{ input: 'window', source: 'time_range' }]).values).toEqual({
      window: {
        from: '2026-11-15T11:45:00.000Z',
        to: '2026-11-15T12:00:00.000Z',
        fromExpression: 'now-15m',
        toExpression: 'now',
      },
    });
  });

  it('passes one end of the time range to a date input', () => {
    expect(resolve([{ input: 'since', source: 'time_range', part: 'from' }]).values).toEqual({
      since: '2026-11-15T11:45:00.000Z',
    });
  });

  it('passes the calendar day, not a timestamp, to a date-only input', () => {
    const { values, issues } = resolve([{ input: 'day', source: 'time_range', part: 'from' }], {
      timeRange: { from: 'now/d', to: 'now' },
    });
    expect(issues).toEqual([]);
    expect(values).toEqual({ day: moment(now).format('YYYY-MM-DD') });
  });

  it('rounds the end of a rounded range up, in the time zone the dashboard shows', () => {
    const { values } = resolve([{ input: 'since', source: 'time_range', part: 'to' }], {
      timeRange: { from: 'now/d', to: 'now/d' },
    });
    expect(values).toEqual({ since: moment(now).endOf('day').toISOString() });
  });

  it('reports a time range that cannot be parsed', () => {
    const { issues } = resolve([{ input: 'window', source: 'time_range' }], {
      timeRange: { from: 'yesterday-ish', to: 'now' },
    });
    expect(issues).toEqual([
      { input: 'window', message: expect.stringContaining('yesterday-ish') },
    ]);
  });

  it('passes the query and filters both as authored and compiled', () => {
    const { values } = resolve([{ input: 'scope', source: 'query' }]);
    expect(values.scope).toEqual({
      query: context.query,
      filters: [hostFilter],
      compiledQuery: {
        bool: {
          must: [],
          filter: [
            {
              bool: {
                minimum_should_match: 1,
                should: [{ match_phrase: { 'service.name': 'payments' } }],
              },
            },
            { match_phrase: { 'host.name': 'web-1' } },
          ],
          should: [],
          must_not: [],
        },
      },
    });
  });

  it('compiles only the filters when the dashboard uses ES|QL', () => {
    const esql = { esql: 'FROM logs-* | LIMIT 10' };
    const { values } = resolve([{ input: 'scope', source: 'query' }], { query: esql });
    expect(values.scope).toMatchObject({
      query: esql,
      compiledQuery: { bool: { filter: [{ match_phrase: { 'host.name': 'web-1' } }] } },
    });
  });

  it('reports a query that does not compile', () => {
    const { issues } = resolve([{ input: 'scope', source: 'query' }], {
      query: { language: 'kuery', query: 'service.name : (' },
    });
    expect(issues).toEqual([{ input: 'scope', message: expect.stringContaining('compiled') }]);
  });

  it('coerces constants to the input type', () => {
    expect(
      resolve([
        { input: 'limit', source: 'constant', value: '25' },
        { input: 'dryRun', source: 'constant', value: true },
        { input: 'severity', source: 'constant', value: 'high' },
      ])
    ).toEqual({ values: { limit: 25, dryRun: true, severity: 'high' }, issues: [] });
  });

  it('reports constants that do not fit the input', () => {
    const { issues } = resolve([
      { input: 'limit', source: 'constant', value: '2.5' },
      { input: 'severity', source: 'constant', value: 'medium' },
    ]);
    expect(issues.map(({ input }) => input)).toEqual(['limit', 'severity']);
  });

  it('reports mappings to inputs the workflow no longer has', () => {
    expect(resolve([{ input: 'renamed', source: 'constant', value: 'x' }]).issues).toEqual([
      { input: 'renamed', message: expect.stringContaining('no longer has') },
    ]);
  });

  it('produces values the server-side input validation accepts', () => {
    const { values } = resolve([
      { input: 'window', source: 'time_range' },
      { input: 'scope', source: 'query' },
      { input: 'host', source: 'control', control_id: 'one' },
      { input: 'bytes', source: 'control', control_id: 'range' },
      { input: 'since', source: 'time_range', part: 'from' },
    ]);
    expect(buildFieldsZodValidator(inputs).safeParse(values).success).toBe(true);
  });
});
