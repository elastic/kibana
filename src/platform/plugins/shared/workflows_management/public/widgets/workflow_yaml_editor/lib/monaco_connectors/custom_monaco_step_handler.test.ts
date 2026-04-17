/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { CustomMonacoStepHandler } from './custom_monaco_step_handler';
import { createMockHoverContext, createMockStepContext } from './test_utils/mock_factories';

const mockStepDefinitions: PublicStepDefinition[] = [
  {
    id: 'custom.myStep',
    label: 'My Custom Step',
    description: 'A custom step for testing',
    documentation: {
      details: 'This is a custom step with detailed documentation',
      url: 'https://example.com/docs',
      examples: ['example1: value1', 'example2: value2'],
    },
  } as unknown as PublicStepDefinition,
  {
    id: 'custom.noDocStep',
    label: 'No Doc Step',
    description: 'A step without documentation details',
  } as unknown as PublicStepDefinition,
];

jest.mock('../../../../../common/step_schemas', () => ({
  stepSchemas: {
    getAllRegisteredStepDefinitions: jest.fn().mockReturnValue([]),
  },
}));

const { stepSchemas } = jest.requireMock('../../../../../common/step_schemas');

describe('CustomMonacoStepHandler', () => {
  let handler: CustomMonacoStepHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    stepSchemas.getAllRegisteredStepDefinitions.mockReturnValue(mockStepDefinitions);
    handler = new CustomMonacoStepHandler();
  });

  describe('canHandle', () => {
    it('should handle registered custom step types', () => {
      expect(handler.canHandle('custom.myStep')).toBe(true);
      expect(handler.canHandle('custom.noDocStep')).toBe(true);
    });

    it('should not handle unregistered step types', () => {
      expect(handler.canHandle('unknown.step')).toBe(false);
      expect(handler.canHandle('elasticsearch.search')).toBe(false);
    });
  });

  describe('getPriority', () => {
    it('should have priority 80', () => {
      expect(handler.getPriority()).toBe(80);
    });
  });

  describe('generateHoverContent', () => {
    it('should return null when there is no step context', async () => {
      const context = createMockHoverContext('custom.myStep');
      const result = await handler.generateHoverContent(context);
      expect(result).toBeNull();
    });

    it('should return hover content for a registered custom step', async () => {
      const stepContext = createMockStepContext();
      const context = createMockHoverContext('custom.myStep', stepContext);
      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      expect(result?.value).toContain('My Custom Step');
      expect(result?.value).toContain('custom.myStep');
      expect(result?.value).toContain('A custom step for testing');
      expect(result?.isTrusted).toBe(true);
    });

    it('should include documentation details when available', async () => {
      const stepContext = createMockStepContext();
      const context = createMockHoverContext('custom.myStep', stepContext);
      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      expect(result?.value).toContain('This is a custom step with detailed documentation');
      expect(result?.value).toContain('https://example.com/docs');
      expect(result?.value).toContain('example1: value1');
    });

    it('should handle steps without documentation details', async () => {
      const stepContext = createMockStepContext({ stepType: 'custom.noDocStep' });
      const context = createMockHoverContext('custom.noDocStep', stepContext);
      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      expect(result?.value).toContain('No Doc Step');
      expect(result?.value).toContain('A step without documentation details');
      expect(result?.value).not.toContain('**Description**:');
      expect(result?.value).not.toContain('**Documentation**:');
    });

    it('should return null for an unregistered step type', async () => {
      const stepContext = createMockStepContext({ stepType: 'unknown.step' });
      const context = createMockHoverContext('unknown.step', stepContext);
      const result = await handler.generateHoverContent(context);

      expect(result).toBeNull();
    });
  });

  describe('getExamples', () => {
    it('should return examples for a step with documentation examples', () => {
      const result = handler.getExamples('custom.myStep');
      expect(result).not.toBeNull();
      expect(result?.snippet).toContain('type: custom.myStep');
    });

    it('should return null for a step without documentation examples', () => {
      const result = handler.getExamples('custom.noDocStep');
      expect(result).toBeNull();
    });

    it('should return null for an unregistered step type', () => {
      const result = handler.getExamples('unknown.step');
      expect(result).toBeNull();
    });
  });
});
