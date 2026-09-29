/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { resolveBaseConnectorType } from './use_connector_type_decorations';

const mockBuiltInStepTypes = new Set([
  'foreach',
  'if',
  'parallel',
  'merge',
  'data.set',
  'wait',
  'workflow.execute',
  'workflow.executeAsync',
]);

const mockRegisteredStepDefinitions = new Map<string, { id: string }>([
  ['data.map', { id: 'data.map' }],
  ['data.filter', { id: 'data.filter' }],
  ['data.dedupe', { id: 'data.dedupe' }],
  ['ai.classify', { id: 'ai.classify' }],
  ['ai.prompt', { id: 'ai.prompt' }],
  ['ai.summarize', { id: 'ai.summarize' }],
]);

vi.mock('@kbn/workflows', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/workflows')),
    isBuiltInStepType: (type: string) => mockBuiltInStepTypes.has(type),
    getBuiltInStepStability: vi.fn().mockReturnValue(undefined),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../common/step_schemas', () => {
  const mocked = {
    stepSchemas: {
      getStepDefinition: (id: string) => mockRegisteredStepDefinitions.get(id),
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../common/schema', () => {
  const mocked = {
    getCachedAllConnectorsMap: vi.fn().mockReturnValue(new Map()),
  };
  return { ...mocked, default: mocked };
});

describe('resolveBaseConnectorType', () => {
  describe('built-in step types preserve full type', () => {
    it.each(['foreach', 'if', 'parallel', 'merge', 'data.set', 'wait', 'workflow.execute'])(
      'keeps "%s" as-is',
      (type) => {
        expect(resolveBaseConnectorType(type)).toBe(type);
      }
    );
  });

  describe('registered step types preserve full type', () => {
    it.each(['data.map', 'data.filter', 'data.dedupe', 'ai.classify', 'ai.prompt'])(
      'keeps "%s" as-is',
      (type) => {
        expect(resolveBaseConnectorType(type)).toBe(type);
      }
    );
  });

  describe('connector+action combos are split to the base connector', () => {
    it.each([
      ['aws_lambda.invoke', 'aws_lambda'],
      ['.jira.createIssue', 'jira'],
      ['elasticsearch.search', 'elasticsearch'],
      ['kibana.alerting', 'kibana'],
      ['slack_api.postMessage', 'slack'],
    ])('resolves "%s" → "%s"', (input, expected) => {
      expect(resolveBaseConnectorType(input)).toBe(expected);
    });
  });

  describe('simple connector types pass through', () => {
    it.each(['console', 'http', 'email'])('keeps "%s" as-is', (type) => {
      expect(resolveBaseConnectorType(type)).toBe(type);
    });
  });
});
