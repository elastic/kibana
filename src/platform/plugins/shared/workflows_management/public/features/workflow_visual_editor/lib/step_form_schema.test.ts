/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorContractUnion } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import {
  buildDefaultStep,
  fieldLabelDivergesFromKey,
  findUnclosedTemplateExpression,
  getStepFormSchema,
  isFieldValueRepresentable,
  isStepIncomplete,
  prettifyFieldKey,
  validateStepField,
  type StepFormField,
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

  describe('buildDefaultStep', () => {
    it('pre-fills required fields and schema defaults only', () => {
      const step = buildDefaultStep('slack', 'slack_step', connectors);
      expect(step).toEqual({
        name: 'slack_step',
        type: 'slack',
        'connector-id': '',
        with: { message: '', level: 'info' },
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

    it('reports unclosed template expressions', () => {
      expect(findUnclosedTemplateExpression('Hello {{ inputs.x')).toBe(true);
      expect(findUnclosedTemplateExpression('Hello {{ inputs.x }}')).toBe(false);
      expect(validateStepField(requiredText, 'Hi {{ inputs.user')).toBe('Unclosed {{ expression');
    });
  });
});
