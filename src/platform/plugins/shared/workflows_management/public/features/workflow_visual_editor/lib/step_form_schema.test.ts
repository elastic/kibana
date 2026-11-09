/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorContractUnion } from '@kbn/workflows';
import { SET_ALERTS_STATUS_CONTRACT } from '@kbn/workflows/spec/kibana/overrides/kibana.set_alerts_status';
import { z } from '@kbn/zod/v4';
import {
  buildDefaultStep,
  fieldLabelDivergesFromKey,
  findUnclosedTemplateExpression,
  getMissingRequiredFields,
  getStepConfigWarningReason,
  getStepFormSchema,
  isFieldValueRepresentable,
  isStepIncomplete,
  prettifyFieldKey,
  type StepFormField,
  validateStepField,
} from './step_form_schema';

const connectors: ConnectorContractUnion[] = [
  {
    type: 'slack',
    hasConnectorId: 'required',
    paramsSchema: z.object({
      message: z.string().describe('Text to post'),
      channel: z.string().optional(),
      level: z.enum(['info', 'warn']).default('info'),
      body: z.record(z.string(), z.unknown()).optional(),
    }),
    outputSchema: z.unknown(),
    summary: null,
    description: null,
  } as unknown as ConnectorContractUnion,
];

describe('step_form_schema', () => {
  describe('prettifyFieldKey', () => {
    it('sentence-cases camelCase, kebab, and snake keys', () => {
      expect(prettifyFieldKey('failOnError')).toBe('Fail on error');
      expect(prettifyFieldKey('connector-id')).toBe('Connector id');
      expect(prettifyFieldKey('file_hash')).toBe('File hash');
      expect(prettifyFieldKey('name')).toBe('Name');
    });
  });

  describe('fieldLabelDivergesFromKey', () => {
    it('ignores casing and separators; flags semantic renames', () => {
      expect(fieldLabelDivergesFromKey('failOnError', 'Fail on error')).toBe(false);
      expect(fieldLabelDivergesFromKey('connector-id', 'Connector id')).toBe(false);
      expect(fieldLabelDivergesFromKey('hash', 'File hash')).toBe(true);
    });
  });

  describe('getStepFormSchema', () => {
    it('emits a connector configSchema at the step root', () => {
      const mapLike = {
        type: 'data.map',
        paramsSchema: z.object({ fields: z.record(z.string(), z.string()) }),
        configSchema: z.object({ items: z.unknown().meta({ advanced: false }) }),
        outputSchema: z.unknown(),
        summary: null,
        description: null,
      } as unknown as ConnectorContractUnion;
      const items = getStepFormSchema('data.map', [mapLike])?.fields.find((f) => f.key === 'items');
      expect(items).toMatchObject({ path: ['items'], advanced: false });
      expect(items?.templatable).toBeUndefined();
    });

    describe('a root `source` of a data step', () => {
      const dataStep = (type: string, source: z.ZodType): ConnectorContractUnion =>
        ({
          type,
          paramsSchema: z.object({}),
          configSchema: z.object({ source }),
          outputSchema: z.unknown(),
          summary: null,
          description: null,
        } as unknown as ConnectorContractUnion);

      it('is a JSON + Liquid code field that stays a string, promoted out of Advanced', () => {
        const source = getStepFormSchema('data.parseJson', [
          dataStep(
            'data.parseJson',
            z.unknown().meta({ language: 'json-liquid', advanced: false })
          ),
        ])?.fields.find((f) => f.key === 'source');
        expect(source).toMatchObject({
          path: ['source'],
          kind: 'code',
          language: 'json-liquid',
          advanced: false,
          valueFormWhenWhole: true,
        });
      });

      it('opens on Data for a plaintext or JSON source that usually holds a reference', () => {
        const meta = { preferData: true, advanced: false };
        const [regex, stringify] = [
          getStepFormSchema('data.regexExtract', [
            dataStep('data.regexExtract', z.unknown().meta({ ...meta, language: 'plaintext' })),
          ])?.fields.find((f) => f.key === 'source'),
          getStepFormSchema('data.stringifyJson', [
            dataStep('data.stringifyJson', z.unknown().meta(meta)),
          ])?.fields.find((f) => f.key === 'source'),
        ];
        expect(regex).toMatchObject({ kind: 'code', language: 'plaintext', preferData: true });
        expect(regex?.valueFormWhenWhole).toBeUndefined();
        expect(stringify).toMatchObject({ kind: 'code', language: 'json', preferData: true });
      });

      it('still hides the transport-only `with.source` / `with.pretty` of a connector', () => {
        const esLike = {
          type: 'elasticsearch.search',
          paramsSchema: z.object({
            index: z.string().optional(),
            source: z.string().optional(),
            pretty: z.boolean().optional(),
          }),
          outputSchema: z.unknown(),
          summary: null,
          description: null,
        } as unknown as ConnectorContractUnion;
        const keys = getStepFormSchema('elasticsearch.search', [esLike])?.fields.map((f) => f.key);
        expect(keys).toEqual(['index']);
      });
    });

    it('gives a map-valued `with` (data.set) one required key-value field', () => {
      const fields = getStepFormSchema('data.set', [])?.fields;
      expect(fields).toHaveLength(1);
      expect(fields?.[0]).toMatchObject({
        key: 'with',
        path: ['with'],
        label: 'Variables',
        required: true,
        kind: 'key-value',
      });
    });

    it('edits maps of scalars as key-value, and leaves maps of anything else as JSON', () => {
      const mapConnectors = [
        {
          type: 'mapper',
          hasConnectorId: false,
          paramsSchema: z.object({
            headers: z.record(z.string(), z.string()).optional(),
            labels: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
            settings: z.record(z.string(), z.unknown()).optional(),
            nested: z.record(z.string(), z.object({ a: z.string() })).optional(),
          }),
          outputSchema: z.unknown(),
          summary: null,
          description: null,
        } as unknown as ConnectorContractUnion,
      ];
      const kindOf = (key: string) =>
        getStepFormSchema('mapper', mapConnectors)?.fields.find((f) => f.key === key)?.kind;
      expect(kindOf('headers')).toBe('key-value');
      expect(kindOf('labels')).toBe('key-value');
      expect(kindOf('settings')).toBe('code');
      expect(kindOf('nested')).toBe('code');
    });

    it('edits a map as rows when its schema opts in, even if its values are not scalars', () => {
      const nestedValue = z.union([z.string(), z.object({ a: z.string() })]);
      const mapConnectors = [
        {
          type: 'mapper',
          hasConnectorId: false,
          paramsSchema: z.object({
            fields: z.record(z.string(), nestedValue).meta({ keyValue: true }),
            plain: z.record(z.string(), nestedValue),
          }),
          outputSchema: z.unknown(),
          summary: null,
          description: null,
        } as unknown as ConnectorContractUnion,
      ];
      const kindOf = (key: string) =>
        getStepFormSchema('mapper', mapConnectors)?.fields.find((f) => f.key === key)?.kind;
      expect(kindOf('fields')).toBe('key-value');
      expect(kindOf('plain')).toBe('code');
    });

    it('asks for the value form on the condition of `if` and `while`, and nowhere else', () => {
      const filterLike = {
        type: 'data.filter',
        hasConnectorId: false,
        configSchema: z.object({ items: z.unknown() }),
        paramsSchema: z.object({ condition: z.string() }),
        outputSchema: z.unknown(),
        summary: null,
        description: null,
      } as unknown as ConnectorContractUnion;
      const condition = (type: string, available: ConnectorContractUnion[] = []) =>
        getStepFormSchema(type, available)?.fields.find((f) => f.key === 'condition');

      expect(condition('if')).toMatchObject({ kind: 'code', language: 'kuery' });
      expect(condition('if')?.valueFormWhenWhole).toBe(true);
      expect(condition('while')?.valueFormWhenWhole).toBe(true);
      // `data.filter` evaluates its condition once per item: a whole `${{ }}` would run once.
      expect(condition('data.filter', [filterLike])?.valueFormWhenWhole).toBeUndefined();
    });

    it('starts a field on earlier data when its schema says it usually holds a reference', () => {
      const connector = {
        type: 'mapper',
        hasConnectorId: false,
        configSchema: z.object({
          items: z.unknown().meta({ advanced: false, preferData: true }),
          other: z.unknown(),
        }),
        paramsSchema: z.object({}),
        outputSchema: z.unknown(),
        summary: null,
        description: null,
      } as unknown as ConnectorContractUnion;
      const field = (key: string) =>
        getStepFormSchema('mapper', [connector])?.fields.find((f) => f.key === key);
      // It stays a JSON field when fixed, and stays optional: nothing marks it as required.
      expect(field('items')).toMatchObject({ kind: 'code', language: 'json', required: false });
      expect(field('items')?.preferData).toBe(true);
      expect(field('other')?.preferData).toBeUndefined();
    });

    it('edits lists of text as tags, and says whether one value alone is valid', () => {
      const listConnectors = [
        {
          type: 'lister',
          hasConnectorId: false,
          paramsSchema: z.object({
            tags: z.array(z.string()).optional(),
            index: z.union([z.string(), z.array(z.string())]).optional(),
            status: z.array(z.enum(['open', 'closed'])).optional(),
            ids: z.array(z.number()).optional(),
            rules: z.array(z.object({ id: z.string() })).optional(),
          }),
          outputSchema: z.unknown(),
          summary: null,
          description: null,
        } as unknown as ConnectorContractUnion,
      ];
      const field = (key: string) =>
        getStepFormSchema('lister', listConnectors)?.fields.find((f) => f.key === key);
      expect(field('tags')).toMatchObject({ kind: 'list', acceptsSingle: false });
      expect(field('index')).toMatchObject({ kind: 'list', acceptsSingle: true });
      expect(field('status')).toMatchObject({
        kind: 'list',
        acceptsSingle: false,
        options: ['open', 'closed'],
      });
      expect(field('tags')?.preferData).toBeUndefined();
      // Lists of anything but text keep the JSON editor.
      expect(field('ids')?.kind).toBe('code');
      expect(field('rules')?.kind).toBe('code');
    });

    it('offers max-iterations as a number or a limit with a behavior, both fixed-only', () => {
      const field = getStepFormSchema('while', [])?.fields.find((f) => f.key === 'max-iterations');
      expect(field).toMatchObject({ kind: 'variants', templatable: false, required: false });
      const [number, limit] = field?.variants ?? [];
      expect(number).toMatchObject({ label: 'Number', kind: 'scalar' });
      expect(number.fields[0]).toMatchObject({
        kind: 'number',
        path: ['max-iterations'],
        templatable: false,
      });
      expect(limit).toMatchObject({ label: 'Limit + behavior', kind: 'object' });
      expect(limit.fields.map((f) => [f.path.join('.'), f.kind, f.templatable])).toEqual([
        ['max-iterations.limit', 'number', false],
        ['max-iterations.on-limit', 'select', false],
      ]);
    });

    it('turns the four shapes of SetAlertsStatus into the two choices: by IDs or by query', () => {
      const field = getStepFormSchema('kibana.SetAlertsStatus', [
        SET_ALERTS_STATUS_CONTRACT as unknown as ConnectorContractUnion,
      ])?.fields.find((f) => f.key === 'with');
      expect(field).toMatchObject({ kind: 'variants', path: ['with'], required: true });
      expect(field?.variants?.map((v) => v.label)).toEqual(['Signal ids', 'Query']);
      const byIds = field?.variants?.[0];
      // "close" and "set status" by IDs are one choice, so `status` offers every status.
      expect(byIds?.fields.find((f) => f.key === 'status')?.options).toEqual(
        expect.arrayContaining(['open', 'acknowledged', 'in-progress', 'closed'])
      );
      expect(byIds?.fields.map((f) => f.key)).toEqual(
        expect.arrayContaining(['signal_ids', 'status', 'reason'])
      );
      expect(byIds?.fields.find((f) => f.key === 'signal_ids')?.path).toEqual([
        'with',
        'signal_ids',
      ]);
    });

    it('leaves nullable objects, lists and maps alone: they are not a choice of shape', () => {
      const oddConnectors = [
        {
          type: 'odd',
          hasConnectorId: false,
          paramsSchema: z.object({
            maybe: z.union([z.object({ a: z.string() }), z.null()]).optional(),
            either: z.union([z.object({ a: z.string() }), z.array(z.string())]).optional(),
            just: z.union([z.string(), z.number()]).optional(),
          }),
          outputSchema: z.unknown(),
          summary: null,
          description: null,
        } as unknown as ConnectorContractUnion,
      ];
      const kind = (key: string) =>
        getStepFormSchema('odd', oddConnectors)?.fields.find((f) => f.key === key)?.kind;
      expect(kind('maybe')).toBe('code');
      expect(kind('either')).toBe('code');
      expect(kind('just')).not.toBe('variants');
    });

    it('treats foreach as a list that usually comes from earlier data', () => {
      expect(
        getStepFormSchema('foreach', [])?.fields.find((f) => f.key === 'foreach')
      ).toMatchObject({ kind: 'list', acceptsSingle: true, preferData: true });
    });

    it('adds a non-templatable max-iterations field to loop steps', () => {
      const maxIterations = getStepFormSchema('while', [])?.fields.find(
        (f) => f.key === 'max-iterations'
      );
      expect(maxIterations).toMatchObject({ path: ['max-iterations'], templatable: false });
      expect(getStepFormSchema('foreach', [])?.fields.some((f) => f.key === 'max-iterations')).toBe(
        true
      );
    });

    it('derives connector fields from paramsSchema under `with` plus connector-id', () => {
      const schema = getStepFormSchema('slack', connectors);
      expect(schema).toBeDefined();
      const byKey = Object.fromEntries(schema!.fields.map((f) => [f.key, f]));
      expect(byKey['connector-id']).toMatchObject({
        path: ['connector-id'],
        required: true,
        label: 'Connector id',
      });
      expect(byKey.message).toMatchObject({
        path: ['with', 'message'],
        required: true,
        kind: 'text',
        description: 'Text to post',
        label: 'Message',
      });
      expect(byKey.channel).toMatchObject({ required: false, label: 'Channel' });
      expect(byKey.level).toMatchObject({
        kind: 'select',
        options: ['info', 'warn'],
        defaultValue: 'info',
        label: 'Level',
      });
      expect(byKey.body).toMatchObject({ kind: 'code', language: 'json', label: 'Body' });
    });

    it('prefers schema meta title over prettified keys', () => {
      const metaConnectors: ConnectorContractUnion[] = [
        {
          type: 'hash',
          hasConnectorId: false,
          paramsSchema: z.object({
            hash: z.string().meta({ title: 'File hash' }),
            failOnError: z.boolean().optional(),
          }),
          outputSchema: z.unknown(),
          summary: null,
          description: null,
        } as unknown as ConnectorContractUnion,
      ];
      const schema = getStepFormSchema('hash', metaConnectors);
      const byKey = Object.fromEntries(schema!.fields.map((f) => [f.key, f]));
      expect(byKey.hash.label).toBe('File hash');
      expect(byKey.failOnError.label).toBe('Fail on error');
    });

    it('maps ES|QL query strings to an esql code field (not JSON)', () => {
      const esqlConnectors: ConnectorContractUnion[] = [
        {
          type: 'elasticsearch.esql.query',
          hasConnectorId: false,
          paramsSchema: z.object({
            query: z.string().min(1).describe('ES|QL query string'),
            format: z.string().optional(),
            filter: z.record(z.string(), z.unknown()).optional(),
          }),
          outputSchema: z.unknown(),
          summary: 'Run an ES|QL query',
          description: null,
        } as unknown as ConnectorContractUnion,
      ];
      const schema = getStepFormSchema('elasticsearch.esql.query', esqlConnectors)!;
      const byKey = Object.fromEntries(schema.fields.map((f) => [f.key, f]));
      expect(byKey.query).toMatchObject({
        kind: 'code',
        language: 'esql',
        path: ['with', 'query'],
        required: true,
      });
      // Object-shaped siblings still use JSON.
      expect(byKey.filter).toMatchObject({ kind: 'code', language: 'json' });
    });

    it('keeps object-shaped query fields as JSON code', () => {
      const searchConnectors: ConnectorContractUnion[] = [
        {
          type: 'elasticsearch.search',
          hasConnectorId: false,
          paramsSchema: z.object({
            index: z.string().optional(),
            query: z.record(z.string(), z.unknown()).optional(),
          }),
          outputSchema: z.unknown(),
          summary: null,
          description: null,
        } as unknown as ConnectorContractUnion,
      ];
      const schema = getStepFormSchema('elasticsearch.search', searchConnectors)!;
      expect(schema.fields.find((f) => f.key === 'query')).toMatchObject({
        kind: 'code',
        language: 'json',
      });
    });

    it('maps string body fields to plaintext code (not JSON)', () => {
      const httpConnectors: ConnectorContractUnion[] = [
        {
          type: 'http',
          hasConnectorId: false,
          paramsSchema: z.object({
            url: z.string(),
            body: z.string().optional(),
          }),
          outputSchema: z.unknown(),
          summary: null,
          description: null,
        } as unknown as ConnectorContractUnion,
      ];
      const schema = getStepFormSchema('http', httpConnectors)!;
      expect(schema.fields.find((f) => f.key === 'body')).toMatchObject({
        kind: 'code',
        language: 'plaintext',
      });
    });

    it('resolves Kibana aliases and deprecations to a connector schema', () => {
      const connectors: ConnectorContractUnion[] = [
        {
          type: 'kibana.createCase',
          hasConnectorId: false,
          paramsSchema: z.object({
            title: z.string(),
            description: z.string().optional(),
          }),
          outputSchema: z.unknown(),
          summary: 'Create a case',
          description: null,
        } as unknown as ConnectorContractUnion,
      ];
      const schema = getStepFormSchema('kibana.createCaseDefaultSpace', connectors)!;
      expect(schema).toBeDefined();
      const byKey = Object.fromEntries(schema.fields.map((f) => [f.key, f]));
      expect(byKey.title).toMatchObject({
        path: ['with', 'title'],
        required: true,
        kind: 'text',
      });
      expect(byKey.description).toMatchObject({ required: false });
    });

    it('follows deprecation replacements when only the new type is registered', () => {
      const connectors: ConnectorContractUnion[] = [
        {
          type: 'cases.createCase',
          hasConnectorId: false,
          paramsSchema: z.object({
            title: z.string(),
          }),
          outputSchema: z.unknown(),
          summary: 'Create a case',
          description: null,
        } as unknown as ConnectorContractUnion,
      ];
      const schema = getStepFormSchema('kibana.createCaseDefaultSpace', connectors)!;
      expect(schema.fields.find((f) => f.key === 'title')).toMatchObject({
        path: ['with', 'title'],
        required: true,
      });
    });

    it('maps built-in `if` to a KQL code field and hides nested step arrays', () => {
      const schema = getStepFormSchema('if', connectors);
      const keys = schema!.fields.map((f) => f.key);
      expect(keys).toContain('condition');
      expect(keys).not.toContain('steps');
      expect(keys).not.toContain('else');
      expect(keys).not.toContain('if');
      const condition = schema!.fields.find((f) => f.key === 'condition');
      expect(condition).toMatchObject({
        kind: 'code',
        language: 'kuery',
        required: true,
        path: ['condition'],
      });
    });

    it('does not hide a `with.*` array-of-union/array-of-object field as nested steps', () => {
      // Regression test: isNestedStepsSchema must only apply to root
      // (configSchema) keys like `if.steps`/`else` — never to `with.*`,
      // where elasticsearch.bulk's required `operations` lives.
      const bulkLikeConnectors: ConnectorContractUnion[] = [
        {
          type: 'bulk-like',
          hasConnectorId: false,
          paramsSchema: z.object({
            operations: z.array(
              z.union([z.object({ index: z.unknown() }), z.record(z.string(), z.unknown())])
            ),
          }),
          outputSchema: z.unknown(),
          summary: null,
          description: null,
        } as unknown as ConnectorContractUnion,
      ];
      const schema = getStepFormSchema('bulk-like', bulkLikeConnectors)!;
      expect(schema.fields.find((f) => f.key === 'operations')).toMatchObject({
        path: ['with', 'operations'],
        required: true,
        kind: 'code',
        language: 'json',
      });
    });

    it('maps built-in `wait` input under `with`', () => {
      const schema = getStepFormSchema('wait', connectors);
      expect(schema!.fields.find((f) => f.key === 'duration')).toMatchObject({
        path: ['with', 'duration'],
        required: true,
      });
    });

    it('returns undefined for unknown types', () => {
      expect(getStepFormSchema('nope.unknown', connectors)).toBeUndefined();
    });

    it('marks curated advanced keys without falling back to requiredness', () => {
      const httpConnectors: ConnectorContractUnion[] = [
        {
          type: 'http',
          hasConnectorId: false,
          paramsSchema: z.object({
            url: z.string().optional(),
            method: z.string().optional(),
            headers: z.record(z.string(), z.unknown()).optional(),
            body: z.unknown().optional(),
            path: z.string().optional(),
            query: z.record(z.string(), z.unknown()).optional(),
            form_data: z.record(z.string(), z.unknown()).optional(),
            fetcher: z.string().optional(),
          }),
          outputSchema: z.unknown(),
          summary: null,
          description: null,
        } as unknown as ConnectorContractUnion,
      ];
      const schema = getStepFormSchema('http', httpConnectors)!;
      const byKey = Object.fromEntries(schema.fields.map((f) => [f.key, f]));
      expect(byKey.url).toMatchObject({ advanced: false });
      expect(byKey.method).toMatchObject({ advanced: false });
      expect(byKey.headers).toMatchObject({ advanced: false });
      expect(byKey.body).toMatchObject({ advanced: false });
      expect(byKey.path).toMatchObject({ advanced: true });
      expect(byKey.query).toMatchObject({ advanced: true });
      expect(byKey.form_data).toMatchObject({ advanced: true });
      expect(byKey.fetcher).toMatchObject({ advanced: true });
    });

    it('honors schema meta.advanced and leaves uncurated actions without advanced hints', () => {
      const withMeta: ConnectorContractUnion[] = [
        {
          type: 'custom.tool',
          hasConnectorId: false,
          paramsSchema: z.object({
            primary: z.string(),
            niche: z.string().optional().meta({ advanced: true }),
          }),
          outputSchema: z.unknown(),
          summary: null,
          description: null,
        } as unknown as ConnectorContractUnion,
      ];
      const schema = getStepFormSchema('custom.tool', withMeta)!;
      const byKey = Object.fromEntries(schema.fields.map((f) => [f.key, f]));
      expect(byKey.primary.advanced).toBeUndefined();
      expect(byKey.niche).toMatchObject({ advanced: true });

      const slack = getStepFormSchema('slack', connectors)!;
      // Uncurated: no hints — optionals follow requiredness at section time.
      expect(slack.fields.every((f) => f.advanced === undefined)).toBe(true);
    });

    it('treats non-primary elasticsearch.search keys as advanced', () => {
      const esConnectors: ConnectorContractUnion[] = [
        {
          type: 'elasticsearch.search',
          hasConnectorId: false,
          paramsSchema: z.object({
            index: z.string().optional(),
            query: z.unknown().optional(),
            size: z.number().optional(),
            timeout: z.string().optional(),
            preference: z.string().optional(),
          }),
          outputSchema: z.unknown(),
          summary: null,
          description: null,
        } as unknown as ConnectorContractUnion,
      ];
      const schema = getStepFormSchema('elasticsearch.search', esConnectors)!;
      const byKey = Object.fromEntries(schema.fields.map((f) => [f.key, f]));
      expect(byKey.index).toMatchObject({ advanced: false });
      expect(byKey.query).toMatchObject({ advanced: false });
      expect(byKey.size).toMatchObject({ advanced: false });
      expect(byKey.timeout).toMatchObject({ advanced: true });
      expect(byKey.preference).toMatchObject({ advanced: true });
    });
  });

  describe('required fields of a choice of shapes', () => {
    const alerts = [SET_ALERTS_STATUS_CONTRACT as unknown as ConnectorContractUnion];
    const missing = (step: Record<string, unknown>, list = alerts) =>
      getMissingRequiredFields(step, list).map((f) => f.path.join('.'));

    it('asks for the keys of the shape the value is in', () => {
      const base = { name: 's', type: 'kibana.SetAlertsStatus' };
      expect(missing({ ...base, with: { status: 'closed' } })).toEqual(['with.signal_ids']);
      expect(missing({ ...base, with: { query: { match_all: {} }, status: 'open' } })).toEqual([]);
      expect(missing({ ...base, with: { signal_ids: ['a'], status: 'closed' } })).toEqual([]);
    });

    it('asks for the first shape while the value is empty', () => {
      expect(missing({ name: 's', type: 'kibana.SetAlertsStatus', with: {} })).toEqual(
        expect.arrayContaining(['with.signal_ids', 'with.status'])
      );
    });

    it('skips an optional choice that is unset, and requires the rest of a started one', () => {
      const loop = {
        name: 'w',
        type: 'while',
        condition: 'x',
        steps: [{ name: 'a', type: 'wait' }],
      };
      expect(getMissingRequiredFields({ ...loop }, []).map((f) => f.key)).toEqual([]);
      expect(
        getMissingRequiredFields({ ...loop, 'max-iterations': 10 }, []).map((f) => f.key)
      ).toEqual([]);
      expect(
        getMissingRequiredFields({ ...loop, 'max-iterations': { limit: 5 } }, []).map((f) => f.key)
      ).toEqual(['on-limit']);
    });
  });

  describe('isStepIncomplete', () => {
    it('flags missing required fields and clears when filled', () => {
      expect(isStepIncomplete({ name: 'a', type: 'slack', with: {} }, connectors)).toBe(true);
      expect(
        isStepIncomplete(
          { name: 'a', type: 'slack', 'connector-id': 'x', with: { message: 'hi' } },
          connectors
        )
      ).toBe(false);
      expect(
        isStepIncomplete(
          { name: 'a', type: 'slack', 'connector-id': 'x', with: { message: '   ' } },
          connectors
        )
      ).toBe(true);
    });

    it('never flags unknown types', () => {
      expect(isStepIncomplete({ name: 'a', type: 'mystery' }, connectors)).toBe(false);
    });
  });

  describe('getStepConfigWarningReason', () => {
    it('returns incomplete for missing required fields', () => {
      expect(getStepConfigWarningReason({ name: 'a', type: 'slack', with: {} }, connectors)).toBe(
        'incomplete'
      );
    });

    it('returns misconfigured for invalid populated values', () => {
      expect(
        getStepConfigWarningReason(
          {
            name: 'a',
            type: 'slack',
            'connector-id': 'x',
            with: { message: 'Hi {{ inputs.x' },
          },
          connectors
        )
      ).toBe('misconfigured');
    });

    it('returns both when required fields are missing and others are invalid', () => {
      expect(
        getStepConfigWarningReason(
          {
            name: 'a',
            type: 'slack',
            'connector-id': '',
            with: { message: 'Hi {{ inputs.x' },
          },
          connectors
        )
      ).toBe('both');
    });

    it('returns undefined when the applied state is valid', () => {
      expect(
        getStepConfigWarningReason(
          { name: 'a', type: 'slack', 'connector-id': 'x', with: { message: 'hi' } },
          connectors
        )
      ).toBeUndefined();
    });
  });

  describe('buildDefaultStep', () => {
    it('starts a data.set step with an empty map of variables', () => {
      expect(buildDefaultStep('data.set', 'vars', [])).toEqual({
        name: 'vars',
        type: 'data.set',
        with: {},
      });
    });

    it('pre-fills required fields and schema defaults only', () => {
      const step = buildDefaultStep('slack', 'slack_step', connectors);
      expect(step).toEqual({
        name: 'slack_step',
        type: 'slack',
        'connector-id': '',
        with: { message: '', level: 'info' },
      });
    });

    it('defaults a required object/record field to an empty string, not `{}`', () => {
      // Required `payload` has no explicit schema default and no string-like
      // shape, so it falls into the JSON/"code" bucket — it must still default
      // to empty (shows the placeholder) rather than a literal `{}`, which
      // would read as real content and block starting the value as an
      // expression.
      const jsonConnectors: ConnectorContractUnion[] = [
        {
          type: 'webhook',
          hasConnectorId: false,
          paramsSchema: z.object({
            payload: z.record(z.string(), z.unknown()),
          }),
          outputSchema: z.unknown(),
          summary: null,
          description: null,
        } as unknown as ConnectorContractUnion,
      ];
      const step = buildDefaultStep('webhook', 'webhook_step', jsonConnectors);
      expect(step).toEqual({
        name: 'webhook_step',
        type: 'webhook',
        with: { payload: '' },
      });
    });

    it('pre-fills a required `with.*` array-of-union field (not hidden as nested steps)', () => {
      const bulkLikeConnectors: ConnectorContractUnion[] = [
        {
          type: 'bulk-like',
          hasConnectorId: false,
          paramsSchema: z.object({
            operations: z.array(
              z.union([z.object({ index: z.unknown() }), z.record(z.string(), z.unknown())])
            ),
          }),
          outputSchema: z.unknown(),
          summary: null,
          description: null,
        } as unknown as ConnectorContractUnion,
      ];
      const step = buildDefaultStep('bulk-like', 'bulk_step', bulkLikeConnectors);
      expect(step).toEqual({
        name: 'bulk_step',
        type: 'bulk-like',
        with: { operations: '' },
      });
    });
  });

  describe('isFieldValueRepresentable', () => {
    const text = { key: 'k', path: ['k'], label: 'k', required: false, kind: 'text' as const };
    it('rejects structured values in scalar controls', () => {
      expect(isFieldValueRepresentable(text, 'x')).toBe(true);
      expect(isFieldValueRepresentable(text, { a: 1 })).toBe(false);
      expect(isFieldValueRepresentable({ ...text, kind: 'code' }, { a: 1 })).toBe(true);
    });

    it('takes a string or a list in a list control, but not a map or a number', () => {
      const list = { ...text, kind: 'list' as const };
      expect(isFieldValueRepresentable(list, 'a')).toBe(true);
      expect(isFieldValueRepresentable(list, ['a', 'b'])).toBe(true);
      expect(isFieldValueRepresentable(list, undefined)).toBe(true);
      expect(isFieldValueRepresentable(list, { a: 1 })).toBe(false);
      expect(isFieldValueRepresentable(list, 5)).toBe(false);
    });

    it('takes a plain map in a key-value control, but not a string or a list', () => {
      const map = { ...text, kind: 'key-value' as const };
      expect(isFieldValueRepresentable(map, { a: 'b' })).toBe(true);
      expect(isFieldValueRepresentable(map, undefined)).toBe(true);
      expect(isFieldValueRepresentable(map, '{{ steps.a.output }}')).toBe(false);
      expect(isFieldValueRepresentable(map, ['a'])).toBe(false);
    });
  });

  describe('validateStepField', () => {
    const requiredText: StepFormField = {
      key: 'connector-id',
      path: ['connector-id'],
      label: 'Connector',
      required: true,
      kind: 'text',
    };

    it('reports required-empty with the field label', () => {
      expect(validateStepField(requiredText, '')).toBe('Connector is required');
      expect(validateStepField(requiredText, 'abc')).toBeUndefined();
    });

    it('reports number and enum failures', () => {
      expect(
        validateStepField(
          { key: 'n', path: ['n'], label: 'N', required: false, kind: 'number' },
          Number.NaN
        )
      ).toBe('Must be a number');
      expect(
        validateStepField(
          {
            key: 'method',
            path: ['with', 'method'],
            label: 'Method',
            required: false,
            kind: 'select',
            options: ['GET', 'POST', 'PUT', 'DELETE'],
          },
          'PATCH'
        )
      ).toBe('Must be one of: GET, POST, PUT, DELETE');
    });

    it('skips typed checks for whole references', () => {
      const numberField: StepFormField = {
        key: 'n',
        path: ['n'],
        label: 'N',
        required: false,
        kind: 'number',
      };
      expect(validateStepField(numberField, '{{ steps.a.output.count }}')).toBeUndefined();
      expect(validateStepField(numberField, '${{ steps.a.output.count }}')).toBeUndefined();
      expect(validateStepField(numberField, 'Found {{ steps.a.output.count }}')).toBe(
        'Must be a number'
      );
    });

    it('reports unclosed template expressions', () => {
      expect(findUnclosedTemplateExpression('Hello {{ inputs.x')).toBe(true);
      expect(findUnclosedTemplateExpression('Hello {{ inputs.x }}')).toBe(false);
      expect(validateStepField(requiredText, 'Hi {{ inputs.user')).toBe('Unclosed {{ expression');
    });

    describe('JSON + Liquid', () => {
      const jsonLiquid: StepFormField = {
        key: 'source',
        path: ['source'],
        label: 'Source',
        required: false,
        kind: 'code',
        language: 'json-liquid',
      };

      it.each([
        [
          'variables as bare values and inside strings',
          '{"id": {{ inputs.id }}, "n": "{{ a.b }}"}',
        ],
        ['a variable filtered to JSON text', '{"tags": {{ inputs.tags | json }}}'],
        ['a Liquid tag, whose output is not predictable', '{% if true %}{"a": 1}{% endif %}'],
        ['a whole reference', '${{ steps.a.output }}'],
        ['a whole variable', '{{ steps.a.output | json }}'],
        ['plain JSON', '{"a": [1, 2, {"b": null}]}'],
      ])('accepts %s', (_name, text) => {
        expect(validateStepField(jsonLiquid, text)).toBeUndefined();
      });

      it('reports an unclosed expression, bad Liquid syntax, and broken JSON', () => {
        expect(validateStepField(jsonLiquid, '{"a": {{ inputs.id }')).toBe(
          'Unclosed {{ expression'
        );
        expect(validateStepField(jsonLiquid, '{"a": {{ inputs.id | nosuchfilter }}}')).toBe(
          'undefined filter: nosuchfilter'
        );
        expect(validateStepField(jsonLiquid, '{% if x %}{"a": 1}')).toBe(
          'tag {% if x %} not closed'
        );
        expect(validateStepField(jsonLiquid, '{"a": }')).toBe(
          'Must be valid JSON (ignoring variables)'
        );
      });
    });
  });
});
