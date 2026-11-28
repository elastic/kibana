/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import { join } from 'path';
import { TrendVisionOne } from './trend_vision_one';
import type { SpecSchema } from './test_helpers';
import {
  AGENT_GUID,
  deref,
  httpError,
  ok,
  request,
  resetMocksAroundEachTest,
  run,
  setVendorSpec,
  specFieldSchemas,
  specOperationOf,
} from './test_helpers';

resetMocksAroundEachTest();

// Expectations come from the recorded vendor spec (vendor_api/), never from the connector code.
const readVendorFile = (...path: string[]) =>
  JSON.parse(fs.readFileSync(join(__dirname, 'vendor_api', ...path), 'utf8'));
setVendorSpec({
  manifest: readVendorFile('manifest.json'),
  snapshot: readVendorFile('snapshots', 'vision_one.openapi.json'),
});

const propertyNames = (schema: SpecSchema | undefined): Set<string> => {
  const names = new Set<string>();
  if (!schema) return names;
  const node = deref(schema);
  for (const name of Object.keys(node.properties ?? {})) names.add(name);
  for (const part of [
    ...(node.oneOf ?? []),
    ...(node.anyOf ?? []),
    ...(node.allOf ?? []),
    ...(node.items ? [node.items] : []),
  ]) {
    for (const name of propertyNames(part)) names.add(name);
  }
  return names;
};

/** True when the sent field names satisfy the spec's required fields (one branch of a oneOf/anyOf). */
const requiredSent = (schema: SpecSchema, sent: Set<string>): boolean => {
  const node = deref(schema);
  const alternatives = node.oneOf ?? node.anyOf;
  return (
    (node.required ?? []).every((name) => sent.has(name)) &&
    (node.allOf ?? []).every((part) => requiredSent(part, sent)) &&
    (!alternatives || alternatives.some((part) => requiredSent(part, sent)))
  );
};

/** True when a sent value has the spec type and, for an enum, one of its values. */
const fitsSchema = (value: unknown, schema: SpecSchema): boolean => {
  if (schema.type === 'array') {
    // An array query parameter is sent comma separated.
    const items = Array.isArray(value) ? value : String(value).split(',');
    return items.every((item) => !schema.items || fitsSchema(item, deref(schema.items)));
  }
  if (schema.enum && !schema.enum.includes(value)) return false;
  switch (schema.type) {
    case 'string':
      return typeof value === 'string';
    case 'integer':
      return Number.isInteger(value);
    case 'number':
      return typeof value === 'number';
    case 'boolean':
      return typeof value === 'boolean';
    default:
      return true;
  }
};

const SHA1 = 'a'.repeat(40);
const OBJECT = { type: 'domain', value: 'test-elastic-soar.invalid' };
/** One valid input per action; path parameters are found by their name in the input. */
const INPUTS: Record<string, Record<string, unknown>> = {
  listAlerts: {
    startDateTime: '2026-11-01T00:00:00Z',
    endDateTime: '2026-11-20T00:00:00Z',
    dateTimeTarget: 'updatedDateTime',
    orderBy: 'createdDateTime desc',
    status: 'Open',
  },
  getAlertDetails: { id: 'WB-9002-20220906-00025' },
  updateAlertStatus: { id: 'WB-9002-20220906-00025', status: 'Closed', etag: '"e1"' },
  addAlertNote: { alertId: 'WB-9002-20220906-00025', content: 'note' },
  listObservedAttackTechniques: {
    detectedStartDateTime: '2026-11-01T00:00:00Z',
    detectedEndDateTime: '2026-11-20T00:00:00Z',
    ingestedStartDateTime: '2026-11-01T00:00:00Z',
    ingestedEndDateTime: '2026-11-20T00:00:00Z',
    top: 50,
    filter: "riskLevel eq 'high'",
  },
  listEndpoints: {
    endpointName: 'lab-win-01',
    top: 10,
    select: ['agentGuid', 'endpointName'],
    orderBy: 'agentGuid asc',
  },
  isolateEndpoint: { agentGuid: AGENT_GUID, description: 'd' },
  restoreEndpointConnection: { endpointName: 'lab-win-01', description: 'd' },
  terminateProcess: {
    agentGuid: AGENT_GUID,
    processId: 4,
    fileName: 'C:\\a.exe',
    fileSha1: SHA1,
    description: 'd',
  },
  collectForensicFile: { agentGuid: AGENT_GUID, filePath: 'C:\\a.txt', description: 'd' },
  getResponseTaskStatus: { id: '00000012' },
  quarantineEmailMessage: { messageId: '<m1@example.com>', mailBox: 'lab@example.com' },
  deleteEmailMessage: { uniqueId: 'AAMk-1', description: 'd' },
  disableUserAccount: { accountName: 'lab.user', description: 'd' },
  enableUserAccount: { accountName: 'lab.user' },
  forceUserSignOut: { accountName: 'lab.user' },
  addToSuspiciousObjectList: {
    ...OBJECT,
    scanAction: 'log',
    riskLevel: 'low',
    daysToExpiration: 1,
    description: 'd',
  },
  removeFromSuspiciousObjectList: OBJECT,
  addToExceptionList: { ...OBJECT, description: 'd' },
  submitFileToSandbox: {
    file: 'ZWxhc3RpYw==',
    fileName: 'a.txt',
    documentPassword: 'p',
    archivePassword: 'p',
    arguments: 'a',
  },
  submitUrlsToSandbox: { urls: ['https://test-elastic-soar.invalid/'] },
  getSandboxAnalysisResult: { id: '012e4eac-9bd9-4e89-95db-77e02f75a6f5' },
};

/** Headers every request may carry that the spec leaves to HTTP itself. */
const TRANSPORT_HEADERS = new Set(['content-type']);

describe('TrendAI Vision One requests match the recorded vendor spec', () => {
  it('has a valid input for every action', () => {
    expect(Object.keys(INPUTS).sort()).toEqual(Object.keys(TrendVisionOne.actions).sort());
  });

  it.each(Object.keys(INPUTS))(
    '%s sends the spec method, path, query, header and body names',
    async (name) => {
      request.mockResolvedValue(ok({}, {}, 200));
      const input = INPUTS[name];
      await run(name, input).catch(() => undefined);
      expect(request).toHaveBeenCalled();
      const sentRequest = request.mock.calls[request.mock.calls.length - 1][0];
      const { method, path, spec } = specOperationOf(name);
      const expectedPath = path.replace(/\{(\w+)\}/g, (_match, param: string) =>
        encodeURIComponent(String(input[param]))
      );
      expect(sentRequest.method.toLowerCase()).toBe(method);
      expect(sentRequest.maxRedirects).toBe(0);
      expect(new URL(sentRequest.url).pathname).toBe(expectedPath);

      const declared = (where: string) =>
        new Set(
          (spec.parameters ?? [])
            .map(deref)
            .filter((p) => p.in === where)
            .map((p) => p.name)
        );
      for (const key of Object.keys(sentRequest.params ?? {})) {
        expect(declared('query')).toContain(key);
      }
      for (const key of Object.keys(sentRequest.headers ?? {})) {
        if (!TRANSPORT_HEADERS.has(key.toLowerCase())) expect(declared('header')).toContain(key);
      }
      const content = (spec.requestBody ? deref(spec.requestBody) : {}).content ?? {};
      const bodyNames = new Set(
        Object.values(content).flatMap(({ schema }) => [...propertyNames(schema)])
      );
      const { data } = sentRequest;
      const sentNames =
        data instanceof FormData
          ? [...new Set(data.keys())]
          : (Array.isArray(data) ? data : data ? [data] : []).flatMap((item: object) =>
              Object.keys(item)
            );
      if (Object.keys(content).length === 0) expect(sentNames).toEqual([]);
      for (const key of sentNames) expect(bodyNames).toContain(key);

      // The body has the spec's shape (an array body is an array) and carries every required field.
      const [bodyContent] = Object.values(content);
      if (bodyContent?.schema) {
        const bodySchema = deref(bodyContent.schema);
        const isArray = bodySchema.type === 'array';
        const sentItems: Array<Set<string>> =
          data instanceof FormData
            ? [new Set<string>(data.keys())]
            : (Array.isArray(data) ? data : [data]).map(
                (item: object) => new Set<string>(Object.keys(item ?? {}))
              );
        if (!(data instanceof FormData)) expect(Array.isArray(data)).toBe(isArray);
        expect(sentItems.length).toBeGreaterThan(0);
        const itemSchema = isArray && bodySchema.items ? bodySchema.items : bodySchema;
        for (const names of sentItems) {
          expect({
            action: name,
            sent: [...names],
            hasRequired: requiredSent(itemSchema, names),
          }).toEqual({ action: name, sent: [...names], hasRequired: true });
        }
      }
    }
  );

  /** The input value a sent field must carry: the same-named input, or the object value under its type. */
  const inputValue = (input: Record<string, unknown>, key: string, where: 'query' | 'body') => {
    if (key in input) {
      const value = input[key];
      return where === 'query' && Array.isArray(value) ? value.join(',') : value;
    }
    return key === input.type ? input.value : undefined;
  };

  it.each(Object.keys(INPUTS))(
    '%s sends query and body values of the spec type and enum, equal to the input',
    async (name) => {
      request.mockResolvedValue(ok({}, {}, 200));
      const input = INPUTS[name];
      await run(name, input).catch(() => undefined);
      const { params, data } = request.mock.calls[request.mock.calls.length - 1][0];
      const { spec } = specOperationOf(name);
      const fields: Array<['query' | 'body', string, unknown]> = [
        ...Object.entries(params ?? {}).map(([key, value]): ['query', string, unknown] => [
          'query',
          key,
          value,
        ]),
        ...(data instanceof FormData
          ? []
          : Array.isArray(data)
            ? data
            : data
              ? [data]
              : []
        ).flatMap((item: Record<string, unknown>) =>
          Object.entries(item).map(([key, value]): ['body', string, unknown] => [
            'body',
            key,
            value,
          ])
        ),
      ];
      for (const [where, key, value] of fields) {
        const schemas = specFieldSchemas(spec, where, key);
        expect(schemas.length).toBeGreaterThan(0);
        // A list query value (select) is one comma-separated string; the spec gives its item enum.
        const parts = where === 'query' && typeof value === 'string' ? value.split(',') : [value];
        const fits = parts.every((part) => schemas.some((schema) => fitsSchema(part, schema)));
        expect({ [key]: fits }).toEqual({ [key]: true });
        const expected = inputValue(input, key, where);
        if (expected !== undefined) expect({ [key]: value }).toEqual({ [key]: expected });
      }
    }
  );

  it.each(Object.keys(INPUTS).filter((name) => TrendVisionOne.actions[name].scope !== 'read'))(
    '%s (state-changing) sends its request once and does not repeat it after a 503',
    async (name) => {
      request.mockRejectedValue(httpError(503));
      await expect(run(name, INPUTS[name])).rejects.toThrow('(503)');
      expect(request).toHaveBeenCalledTimes(1);
    }
  );
});
