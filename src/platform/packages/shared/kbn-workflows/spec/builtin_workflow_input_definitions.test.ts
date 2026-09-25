/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import { z } from '@kbn/zod/v4';
import {
  builtinWorkflowInputDefinitionRefSchema,
  builtinWorkflowInputDefinitionRefValuesForZod,
  builtinWorkflowInputDefinitions,
  KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX,
  mergeKibanaBuiltinWorkflowInputDefinitionsIntoRootSchema,
} from './builtin_workflow_input_definitions';
import { convertJsonSchemaToZod } from './lib/build_fields_zod_validator';

describe('builtinWorkflowInputDefinitions', () => {
  it('registers alertingV2NotificationGroup with required top-level fields', () => {
    const schema = builtinWorkflowInputDefinitions.alertingV2NotificationGroup;
    expect(schema.type).toBe('object');
    expect(schema.required).toEqual(['id', 'policyId', 'groupKey', 'episodes', 'rules']);
    expect(schema.properties?.id?.type).toBe('string');
    expect(schema.properties?.policyId?.type).toBe('string');
    expect(schema.properties?.groupKey?.type).toBe('object');
    expect(schema.properties?.episodes?.type).toBe('array');
    expect(schema.properties?.rules?.type).toBe('object');
  });

  it('registers securityAlertAnalysisCallerAlerts as a bounded alert-document array', () => {
    const schema = builtinWorkflowInputDefinitions.securityAlertAnalysisCallerAlerts;
    expect(schema.type).toBe('array');
    expect(schema.maxItems).toBe(1000);
    const items = schema.items as {
      required?: string[];
      properties?: Record<string, { type?: string; format?: string; pattern?: string }>;
    };
    expect(items?.required).toEqual(
      expect.arrayContaining(['_id', '_index', '@timestamp', 'kibana'])
    );
    expect(items?.properties?._id?.type).toBe('string');
    expect(items?.properties?._index?.pattern).toBe(
      '^\\.(internal\\.)?(preview\\.)?alerts-security\\.alerts-[a-zA-Z0-9._-]+$'
    );
    expect(items?.properties?.['@timestamp']?.format).toBe('date-time');
  });

  it('keeps extra alert fields, including nested kibana.alert fields, when validating securityAlertAnalysisCallerAlerts', () => {
    const validator = convertJsonSchemaToZod(
      builtinWorkflowInputDefinitions.securityAlertAnalysisCallerAlerts as JSONSchema7
    );
    const alert = {
      _id: 'alert-1',
      _index: '.internal.alerts-security.alerts-default-000001',
      '@timestamp': '2026-09-23T10:00:00.000Z',
      host: { name: 'host-1' },
      kibana: {
        space_ids: ['default'],
        alert: {
          workflow_tags: ['ai.classification.true_positive'],
          severity: 'high',
          risk_score: 73,
          rule: { uuid: 'rule-1', name: 'Rule 1', rule_type_id: 'siem.queryRule' },
        },
      },
    };

    expect(validator.parse([alert])).toEqual([alert]);
  });

  it('registers alertingV2NotificationGroup with severity on episode items', () => {
    const schema = builtinWorkflowInputDefinitions.alertingV2NotificationGroup;
    const episodeItems = schema.properties?.episodes?.items as {
      properties?: Record<string, { type?: string | string[]; enum?: unknown[] }>;
    };
    expect(episodeItems?.properties?.severity?.type).toBe('string');
    expect(episodeItems?.properties?.severity?.enum).toEqual([
      'info',
      'low',
      'medium',
      'high',
      'critical',
    ]);
  });

  it('allows null rule_id on episode items to support external alerts', () => {
    const schema = builtinWorkflowInputDefinitions.alertingV2NotificationGroup;
    const episodeItems = schema.properties?.episodes?.items as {
      properties?: Record<string, { type?: string | string[] }>;
    };
    expect(episodeItems?.properties?.rule_id?.type).toEqual(['string', 'null']);
  });

  it('keeps Monaco $ref enum values in sync with registry keys', () => {
    expect(builtinWorkflowInputDefinitionRefValuesForZod).toEqual(
      Object.keys(builtinWorkflowInputDefinitions).map(
        (id) => `${KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX}${id}`
      )
    );
  });

  it('accepts known built-in refs and rejects unbounded $ref strings in Zod', () => {
    const knownRef = builtinWorkflowInputDefinitionRefValuesForZod[0];
    expect(builtinWorkflowInputDefinitionRefSchema.safeParse(knownRef).success).toBe(true);
    expect(
      builtinWorkflowInputDefinitionRefSchema.safeParse('#/definitions/UserSchema').success
    ).toBe(true);
    expect(builtinWorkflowInputDefinitionRefSchema.safeParse('x'.repeat(513)).success).toBe(false);
  });

  it('merges built-in definitions under kibana.definitions without dropping existing entries', () => {
    const merged = mergeKibanaBuiltinWorkflowInputDefinitionsIntoRootSchema({
      type: 'object',
      kibana: {
        definitions: {
          customType: { type: 'string' },
        },
      },
    });

    expect(merged).toMatchObject({
      kibana: {
        definitions: {
          customType: { type: 'string' },
          alertingV2NotificationGroup: expect.objectContaining({ type: 'object' }),
          securityAlertAnalysisCallerAlerts: expect.objectContaining({ type: 'array' }),
        },
      },
    });
  });

  it('lets built-in definitions override colliding kibana.definitions keys', () => {
    const merged = mergeKibanaBuiltinWorkflowInputDefinitionsIntoRootSchema({
      kibana: {
        definitions: {
          alertingV2NotificationGroup: { type: 'string' },
        },
      },
    }) as { kibana: { definitions: { alertingV2NotificationGroup: { type: string } } } };

    expect(merged.kibana.definitions.alertingV2NotificationGroup.type).toBe('object');
  });

  it('exports $ref enum values through z.toJSONSchema for Monaco YAML autocomplete', () => {
    const jsonSchema = z.toJSONSchema(builtinWorkflowInputDefinitionRefSchema, {
      target: 'draft-7',
    }) as { enum?: string[]; anyOf?: Array<{ enum?: string[] }> };

    const enumValues =
      jsonSchema.enum ?? jsonSchema.anyOf?.flatMap((branch) => branch.enum ?? []) ?? [];

    expect(enumValues).toEqual(
      expect.arrayContaining([...builtinWorkflowInputDefinitionRefValuesForZod])
    );
  });
});
