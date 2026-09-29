/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { gzipSync } from 'zlib';
import { GENERATED_GLOBAL_PREFIX } from '../../common/constants';
import type { SpecDefinitionsJson } from '../types';
import kibanaApiDocLinks from '../lib/spec_definitions/kibana_api_doc_links/generated_kibana_api_doc_links.json';
import { compactSpecDefinitions } from './compact_spec_definitions';
import { SpecDefinitionsService } from './spec_definitions_service';

const PAYLOAD_BUDGETS = {
  stack: { decoded: 650_000, gzip: 75_000 },
  serverless: { decoded: 450_000, gzip: 55_000 },
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const expandGeneratedRules = (value: unknown, globals: Record<string, unknown>): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => expandGeneratedRules(entry, globals));
  }
  if (!isRecord(value)) {
    return value;
  }
  const link = value.__scope_link;
  if (typeof link === 'string' && link.startsWith(`GLOBAL.${GENERATED_GLOBAL_PREFIX}`)) {
    return expandGeneratedRules(globals[link.slice('GLOBAL.'.length)], globals);
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      expandGeneratedRules(nestedValue, globals),
    ])
  );
};

const expectValidMetaShapes = (value: unknown): void => {
  if (Array.isArray(value)) {
    value.forEach(expectValidMetaShapes);
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  if (Object.hasOwn(value, '__one_of')) {
    expect(Array.isArray(value.__one_of)).toBe(true);
  }
  if (Object.hasOwn(value, '__any_of')) {
    expect(Array.isArray(value.__any_of)).toBe(true);
  }
  if (isRecord(value.__template) && typeof value.__template.__scope_link === 'string') {
    expect(value.__template.__scope_link.startsWith(`GLOBAL.${GENERATED_GLOBAL_PREFIX}`)).toBe(
      false
    );
  }
  if (Object.hasOwn(value, '__condition')) {
    expect(isRecord(value.__condition)).toBe(true);
    if (isRecord(value.__condition)) {
      expect(typeof value.__condition.lines_regex).toBe('string');
    }
  }
  Object.values(value).forEach(expectValidMetaShapes);
};

const expectLosslessEndpointRules = (
  rawDefinitions: SpecDefinitionsJson,
  compactDefinitions: SpecDefinitionsJson
): void => {
  Object.entries(rawDefinitions.endpoints).forEach(([name, rawEndpoint]) => {
    const compactEndpoint = compactDefinitions.endpoints[name];
    if (!isRecord(rawEndpoint) || !isRecord(compactEndpoint)) {
      throw new Error(`Expected ${name} to be an endpoint definition`);
    }
    const { data_autocomplete_rules: rawRules, ...rawMetadata } = rawEndpoint;
    const { data_autocomplete_rules: compactRules, ...compactMetadata } = compactEndpoint;
    expect(compactMetadata).toEqual(rawMetadata);
    expect(expandGeneratedRules(compactRules, compactDefinitions.globals)).toEqual(rawRules);
  });
  Object.entries(rawDefinitions.globals).forEach(([name, value]) => {
    expect(compactDefinitions.globals[name]).toEqual(value);
  });
};

describe('WHEN serializing the complete Console definitions response', () => {
  it.each(['stack', 'serverless'] as const)(
    'SHOULD preserve all %s endpoint rules within the reviewed size budget',
    (endpointsAvailability) => {
      const service = new SpecDefinitionsService();
      service.start({ endpointsAvailability });
      const rawDefinitions = JSON.parse(JSON.stringify(service.asJson())) as SpecDefinitionsJson;
      const compactDefinitions = compactSpecDefinitions(service.asJson());
      const body = JSON.stringify({
        es: compactDefinitions,
        kibana: { docLinks: kibanaApiDocLinks },
      });
      const budget = PAYLOAD_BUDGETS[endpointsAvailability];

      expectLosslessEndpointRules(rawDefinitions, compactDefinitions);
      expectValidMetaShapes(compactDefinitions);
      expect(Buffer.byteLength(body)).toBeLessThanOrEqual(budget.decoded);
      expect(gzipSync(body).byteLength).toBeLessThanOrEqual(budget.gzip);
    }
  );
});
