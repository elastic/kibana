/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import {
  createUnifiedHoverProvider,
  registerUnifiedHoverProvider,
  UNIFIED_HOVER_PROVIDER_ID,
  UnifiedHoverProvider,
} from './unified_hover_provider';

// --- Mocks ---

jest.mock('../hover/get_intercepted_hover', () => ({
  getInterceptedHover: jest.fn().mockResolvedValue(null),
}));

const mockParseTemplateAtPosition = jest.fn().mockReturnValue(null);
jest.mock('../template_expression/parse_template_at_position', () => ({
  parseTemplateAtPosition: (...args: unknown[]) => mockParseTemplateAtPosition(...args),
}));

jest.mock('../template_expression/evaluate_expression', () => ({
  evaluateExpression: jest.fn(),
}));

jest.mock('../template_expression/resolve_path_value', () => ({
  formatValueAsJson: jest.fn().mockReturnValue('null'),
}));

const mockGetPathAtOffset = jest.fn().mockReturnValue([]);
const mockGetTriggerNodes = jest.fn().mockReturnValue([]);
jest.mock('../../../../../common/lib/yaml', () => ({
  getPathAtOffset: (...args: unknown[]) => mockGetPathAtOffset(...args),
  getTriggerNodes: (...args: unknown[]) => mockGetTriggerNodes(...args),
}));

const mockPerformComputation = jest.fn().mockReturnValue({ workflowLookup: null });
jest.mock('../../../../entities/workflows/store/workflow_detail/utils/computation', () => ({
  performComputation: (...args: unknown[]) => mockPerformComputation(...args),
}));

jest.mock('../../../../features/validate_workflow_yaml/model/types', () => ({
  isYamlValidationMarkerOwner: jest.fn().mockReturnValue(false),
}));

const mockGetTriggerHoverContent = jest.fn().mockReturnValue(null);
const mockGetTriggerTypeAtPath = jest.fn().mockReturnValue(null);
jest.mock('../trigger_hover/get_trigger_hover_content', () => ({
  getTriggerHoverContent: (...args: unknown[]) => mockGetTriggerHoverContent(...args),
  getTriggerTypeAtPath: (...args: unknown[]) => mockGetTriggerTypeAtPath(...args),
}));

const mockGetMonacoConnectorHandler = jest.fn().mockReturnValue(null);
jest.mock('./provider_registry', () => ({
  getMonacoConnectorHandler: (...args: unknown[]) => mockGetMonacoConnectorHandler(...args),
}));

jest.mock('../../../../trigger_schemas', () => ({
  triggerSchemas: {
    getTriggerDefinition: jest.fn().mockReturnValue(null),
  },
}));

const mockGetMonacoRangeFromYamlNode = jest.fn().mockReturnValue(null);
jest.mock('../utils', () => ({
  getMonacoRangeFromYamlNode: (...args: unknown[]) => mockGetMonacoRangeFromYamlNode(...args),
}));

const createMockModel = (content: string = ''): monaco.editor.ITextModel =>
  ({
    uri: { toString: () => 'inmemory://test' },
    getValue: jest.fn().mockReturnValue(content),
    getOffsetAt: jest.fn().mockReturnValue(10),
    getLineContent: jest.fn().mockReturnValue(''),
    getLineDecorations: jest.fn().mockReturnValue([]),
  } as unknown as monaco.editor.ITextModel);

const createMockPosition = (line: number = 1, column: number = 1) =>
  new monaco.Position(line, column);

describe('UnifiedHoverProvider - additional coverage', () => {
  let mockYamlDocument: Record<string, unknown>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockYamlDocument = {
      getIn: jest.fn().mockReturnValue(null),
    };
    mockGetPathAtOffset.mockReturnValue([]);
    mockGetTriggerNodes.mockReturnValue([]);
    mockGetTriggerTypeAtPath.mockReturnValue(null);
    mockParseTemplateAtPosition.mockReturnValue(null);
    mockPerformComputation.mockReturnValue({ workflowLookup: null });

    jest.spyOn(monaco.editor, 'getModelMarkers').mockReturnValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('provider ID', () => {
    it('should expose the correct provider ID', () => {
      const provider = new UnifiedHoverProvider({ getYamlDocument: () => null });
      expect(provider.__providerId).toBe(UNIFIED_HOVER_PROVIDER_ID);
    });
  });

  describe('trigger hover', () => {
    it('should provide trigger hover when cursor is on a trigger type value', async () => {
      const triggerTypeValueNode = {
        range: [5, undefined, 20],
      };
      const triggerNode = {
        node: { range: [0, undefined, 50] },
        triggerType: 'manual',
        typePair: { value: triggerTypeValueNode },
      };

      mockGetPathAtOffset.mockReturnValue(['triggers', 0, 'type']);
      mockGetTriggerNodes.mockReturnValue([triggerNode]);
      mockGetTriggerTypeAtPath.mockReturnValue(null); // First attempt returns null
      // The code falls back to triggerAtPosition.triggerType

      const mockModel = createMockModel('triggers:\n  - type: manual');
      (mockModel.getOffsetAt as jest.Mock).mockReturnValue(15); // Inside trigger range

      mockGetTriggerHoverContent.mockReturnValue({ value: '**manual** trigger' });
      mockGetMonacoRangeFromYamlNode.mockReturnValue(new monaco.Range(2, 12, 2, 18));

      const provider = new UnifiedHoverProvider({
        getYamlDocument: () => mockYamlDocument as never,
      });

      const result = await provider.provideCustomHover(mockModel, createMockPosition(2, 14));

      expect(result).not.toBeNull();
      expect(result?.contents[0].value).toBe('**manual** trigger');
    });

    it('should return null when trigger hover content is null', async () => {
      const triggerTypeValueNode = {
        range: [5, undefined, 20],
      };
      const triggerNode = {
        node: { range: [0, undefined, 50] },
        triggerType: 'unknown_trigger',
        typePair: { value: triggerTypeValueNode },
      };

      mockGetPathAtOffset.mockReturnValue(['triggers', 0, 'type']);
      mockGetTriggerNodes.mockReturnValue([triggerNode]);

      const mockModel = createMockModel('triggers:\n  - type: unknown_trigger');
      (mockModel.getOffsetAt as jest.Mock).mockReturnValue(15);

      mockGetTriggerHoverContent.mockReturnValue(null);

      const provider = new UnifiedHoverProvider({
        getYamlDocument: () => mockYamlDocument as never,
      });

      const result = await provider.provideCustomHover(mockModel, createMockPosition(2, 14));

      expect(result).toBeNull();
    });

    it('should provide trigger hover with range from type value node', async () => {
      const triggerTypeValueNode = {
        range: [10, undefined, 16],
      };
      const triggerNode = {
        node: { range: [0, undefined, 50] },
        triggerType: 'alert',
        typePair: { value: triggerTypeValueNode },
      };

      mockGetPathAtOffset.mockReturnValue(['triggers', 0]);
      mockGetTriggerNodes.mockReturnValue([triggerNode]);
      mockGetTriggerTypeAtPath.mockReturnValue('alert');

      const mockModel = createMockModel('triggers:\n  - type: alert');
      (mockModel.getOffsetAt as jest.Mock).mockReturnValue(12);

      const expectedRange = new monaco.Range(2, 12, 2, 17);
      mockGetTriggerHoverContent.mockReturnValue({ value: '**alert** trigger' });
      mockGetMonacoRangeFromYamlNode.mockReturnValue(expectedRange);

      const provider = new UnifiedHoverProvider({
        getYamlDocument: () => mockYamlDocument as never,
      });

      const result = await provider.provideCustomHover(mockModel, createMockPosition(2, 12));

      expect(result).not.toBeNull();
      expect(result?.range).toEqual(expectedRange);
    });
  });

  describe('shouldShowConnectorHover', () => {
    it('should show hover when path includes "type"', async () => {
      mockGetPathAtOffset.mockReturnValue(['steps', 0, 'type']);
      mockGetTriggerTypeAtPath.mockReturnValue(null);
      mockPerformComputation.mockReturnValue({
        workflowLookup: {
          steps: {
            test: {
              stepId: 'test',
              stepType: 'noop',
              lineStart: 1,
              lineEnd: 5,
              stepYamlNode: {},
              propInfos: { type: { valueNode: {} } },
            },
          },
        },
      });

      const mockHandler = {
        generateHoverContent: jest.fn().mockResolvedValue({ value: 'noop hover' }),
      };
      mockGetMonacoConnectorHandler.mockReturnValue(mockHandler);

      const provider = new UnifiedHoverProvider({
        getYamlDocument: () => mockYamlDocument as never,
      });

      const result = await provider.provideCustomHover(
        createMockModel('steps:\n  - name: test\n    type: noop'),
        createMockPosition(3, 10)
      );

      expect(result).not.toBeNull();
    });

    it('should NOT show hover for arbitrary non-type, non-parameter fields', async () => {
      // Path does not include 'type' and no parameterContext
      mockGetPathAtOffset.mockReturnValue(['steps', 0, 'name']);
      mockGetTriggerTypeAtPath.mockReturnValue(null);
      mockPerformComputation.mockReturnValue({
        workflowLookup: {
          steps: {
            test: {
              stepId: 'test',
              stepType: 'noop',
              lineStart: 1,
              lineEnd: 5,
              isInWithBlock: false,
              stepYamlNode: {},
              propInfos: { type: { valueNode: {} } },
            },
          },
        },
      });

      const provider = new UnifiedHoverProvider({
        getYamlDocument: () => mockYamlDocument as never,
      });

      const result = await provider.provideCustomHover(
        createMockModel('steps:\n  - name: test\n    type: noop'),
        createMockPosition(2, 10)
      );

      expect(result).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should return null when provideCustomHover throws', async () => {
      const provider = new UnifiedHoverProvider({
        getYamlDocument: () => {
          throw new Error('YAML parse failed');
        },
      });

      const result = await provider.provideCustomHover(createMockModel(), createMockPosition());

      expect(result).toBeNull();
    });
  });

  describe('createUnifiedHoverProvider', () => {
    it('should return a valid hover provider', () => {
      const provider = createUnifiedHoverProvider({
        getYamlDocument: () => null,
      });

      expect(provider).toBeDefined();
      expect(typeof provider.provideHover).toBe('function');
    });
  });

  describe('registerUnifiedHoverProvider', () => {
    it('should register with Monaco for yaml language', () => {
      const registerSpy = jest
        .spyOn(monaco.languages, 'registerHoverProvider')
        .mockReturnValue({ dispose: jest.fn() });

      const disposable = registerUnifiedHoverProvider({
        getYamlDocument: () => null,
      });

      expect(registerSpy).toHaveBeenCalledWith('yaml', expect.any(UnifiedHoverProvider));
      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');

      registerSpy.mockRestore();
    });
  });

  describe('getPathFromCurrentLine fallback', () => {
    it('should try to resolve path from line content when getPathAtOffset returns empty', async () => {
      // First getPathAtOffset returns empty, triggering getPathFromCurrentLine
      mockGetPathAtOffset
        .mockReturnValueOnce([]) // Main call - empty
        .mockReturnValueOnce(['steps', 0, 'with']) // Key position attempt
        .mockReturnValueOnce(['steps', 0, 'with']); // Fallback attempts

      mockGetTriggerTypeAtPath.mockReturnValue(null);
      mockPerformComputation.mockReturnValue({ workflowLookup: null });

      const mockModel = createMockModel('    with:');
      (mockModel.getLineContent as jest.Mock).mockReturnValue('    with:');
      (mockModel.getOffsetAt as jest.Mock).mockReturnValue(0);

      const provider = new UnifiedHoverProvider({
        getYamlDocument: () => mockYamlDocument as never,
      });

      // Should not crash even though path resolution is complex
      const result = await provider.provideCustomHover(mockModel, createMockPosition(4, 9));

      // May return null since no step context is found, but should not throw
      expect(result).toBeNull();
    });
  });
});
