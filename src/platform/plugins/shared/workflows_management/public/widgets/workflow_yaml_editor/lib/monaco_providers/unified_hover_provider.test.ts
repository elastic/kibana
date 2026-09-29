/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { monaco } from '@kbn/monaco';
import type { ProviderConfig } from './provider_interfaces';
import {
  createUnifiedHoverProvider,
  registerUnifiedHoverProvider,
  UNIFIED_HOVER_PROVIDER_ID,
  UnifiedHoverProvider,
} from './unified_hover_provider';
import type {
  ExecutionContext,
  StepExecutionData,
} from '../execution_context/build_execution_context';

vi.mock('../hover/get_intercepted_hover', () => {
      const mocked = {
      getInterceptedHover: vi.fn().mockResolvedValue(null),
    };
      return { ...mocked, default: mocked };
    });

const mockParseTemplateAtPosition = vi.fn().mockReturnValue(null);
vi.mock('../template_expression/parse_template_at_position', () => {
      const mocked = {
      parseTemplateAtPosition: (...args: unknown[]) => mockParseTemplateAtPosition(...args),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../template_expression/evaluate_expression', () => {
      const mocked = {
      evaluateExpression: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../template_expression/resolve_path_value', () => {
      const mocked = {
      formatValueAsJson: vi.fn().mockReturnValue('null'),
    };
      return { ...mocked, default: mocked };
    });

const mockGetPathAtOffset = vi.fn().mockReturnValue([]);
const mockGetTriggerNodes = vi.fn().mockReturnValue([]);
vi.mock('../../../../../common/lib/yaml', () => {
      const mocked = {
      getPathAtOffset: (...args: unknown[]) => mockGetPathAtOffset(...args),
      getTriggerNodes: (...args: unknown[]) => mockGetTriggerNodes(...args),
    };
      return { ...mocked, default: mocked };
    });

const mockPerformComputation = vi.fn().mockReturnValue({ workflowLookup: null });
vi.mock('../../../../entities/workflows/store/workflow_detail/utils/computation', () => {
      const mocked = {
      performComputation: (...args: unknown[]) => mockPerformComputation(...args),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/workflows-yaml', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/workflows-yaml')),
      isYamlValidationMarkerOwner: vi.fn().mockReturnValue(false),
    };
      return { ...mocked, default: mocked };
    });

const mockGetTriggerHoverContent = vi.fn().mockReturnValue(null);
const mockGetTriggerTypeAtPath = vi.fn().mockReturnValue(null);
vi.mock('../trigger_hover/get_trigger_hover_content', () => {
      const mocked = {
      getTriggerHoverContent: (...args: unknown[]) => mockGetTriggerHoverContent(...args),
      getTriggerTypeAtPath: (...args: unknown[]) => mockGetTriggerTypeAtPath(...args),
    };
      return { ...mocked, default: mocked };
    });

const mockGetMonacoConnectorHandler = vi.fn().mockReturnValue(null);
vi.mock('./provider_registry', () => {
      const mocked = {
      getMonacoConnectorHandler: (...args: unknown[]) => mockGetMonacoConnectorHandler(...args),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/workflows', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/workflows')),
      resolveKibanaStepTypeAlias: (type: string) =>
        type === 'kibana.createCaseDefaultSpace' ? 'kibana.createCase' : type,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../trigger_schemas', () => {
      const mocked = {
      triggerSchemas: {
        getTriggerDefinition: vi.fn().mockReturnValue(null),
      },
    };
      return { ...mocked, default: mocked };
    });

const mockGetMonacoRangeFromYamlNode = vi.fn().mockReturnValue(null);
vi.mock('../utils', () => {
      const mocked = {
      getMonacoRangeFromYamlNode: (...args: unknown[]) => mockGetMonacoRangeFromYamlNode(...args),
    };
      return { ...mocked, default: mocked };
    });

const { evaluateExpression } = (await vi.importMock('../template_expression/evaluate_expression'));
const { getInterceptedHover } = (await vi.importMock('../hover/get_intercepted_hover'));

const createMockModel = (content: string = '  message: "{{ steps.search.output.hits }}"') =>
  ({
    uri: { toString: () => 'inmemory://test' },
    getValue: vi.fn().mockReturnValue(content),
    getOffsetAt: vi.fn().mockReturnValue(10),
    getLineContent: vi.fn().mockReturnValue(content),
    getLineDecorations: vi.fn().mockReturnValue([]),
  } as unknown as monaco.editor.ITextModel);

const createMockPosition = (line = 1, column = 25) => new monaco.Position(line, column);

describe('UnifiedHoverProvider - lazy-loading step I/O', () => {
  let fetchStepExecutionData: Mock;
  let getExecutionContext: Mock;
  let provider: UnifiedHoverProvider;

  const stepOutputValue = { hits: [{ _id: '1', title: 'result' }] };

  const baseExecutionContext: ExecutionContext = {
    steps: {
      search: {
        status: 'completed',
      },
    },
  };

  const enrichedStepData: StepExecutionData = {
    status: 'completed',
    output: stepOutputValue,
    input: { query: '*' },
  };

  const templateInfo = {
    isInsideTemplate: true,
    expression: 'steps.search.output.hits',
    variablePath: 'steps.search.output.hits',
    pathSegments: ['steps', 'search', 'output', 'hits'],
    cursorSegmentIndex: 3,
    pathUpToCursor: ['steps', 'search', 'output', 'hits'],
    filters: [],
    isOnFilter: false,
    templateRange: new monaco.Range(1, 20, 1, 42),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    fetchStepExecutionData = vi.fn().mockResolvedValue(enrichedStepData);
    getExecutionContext = vi.fn().mockReturnValue(baseExecutionContext);

    // parseTemplateAtPosition returns our template info for every call
    mockParseTemplateAtPosition.mockReturnValue(templateInfo);
    // evaluateExpression resolves the value from the (enriched) context
    evaluateExpression.mockImplementation(
      ({ expression, context }: { expression: string; context: ExecutionContext }) => {
        if (expression === 'steps.search.output.hits' && context.steps.search?.output) {
          return (context.steps.search.output as Record<string, unknown>).hits;
        }
        return undefined;
      }
    );

    // Reset additional mocks
    mockGetPathAtOffset.mockReturnValue([]);
    mockGetTriggerNodes.mockReturnValue([]);
    mockGetTriggerTypeAtPath.mockReturnValue(null);
    mockPerformComputation.mockReturnValue({ workflowLookup: null });

    // Suppress validation markers and line decorations
    vi.spyOn(monaco.editor, 'getModelMarkers').mockReturnValue([]);

    const config: ProviderConfig = {
      getYamlDocument: () => null,
      getExecutionContext,
      fetchStepExecutionData,
      options: { http: {} as any, notifications: {} as any },
    };
    provider = new UnifiedHoverProvider(config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch step data and return enriched hover on first hover', async () => {
    const result = await provider.provideCustomHover(createMockModel(), createMockPosition());

    expect(fetchStepExecutionData).toHaveBeenCalledWith('search');
    expect(result).not.toBeNull();
    expect(result!.contents[0]).toEqual(
      expect.objectContaining({
        value: expect.stringContaining('steps.search.output.hits'),
      })
    );
    // Should contain the resolved value, not "undefined"
    expect(result!.contents[0]).toEqual(
      expect.objectContaining({
        value: expect.not.stringContaining('undefined'),
      })
    );
  });

  it('should return enriched hover on second hover (cache hit, no duplicate fetch)', async () => {
    // First hover
    const result1 = await provider.provideCustomHover(createMockModel(), createMockPosition());
    expect(fetchStepExecutionData).toHaveBeenCalledTimes(1);
    expect(result1).not.toBeNull();

    // Second hover — same step, same execution context (context ref unchanged, no I/O in it)
    const result2 = await provider.provideCustomHover(createMockModel(), createMockPosition());

    // fetchStepExecutionData is called again (cache dedup is in the caller, not the provider)
    expect(fetchStepExecutionData).toHaveBeenCalledTimes(2);
    expect(result2).not.toBeNull();
    // Value should still resolve correctly — this is the regression scenario
    expect(result2!.contents[0]).toEqual(
      expect.objectContaining({
        value: expect.not.stringContaining('undefined'),
      })
    );
  });

  it('should not call fetchStepExecutionData when step output is already in context', async () => {
    const contextWithOutput: ExecutionContext = {
      steps: {
        search: {
          status: 'completed',
          output: stepOutputValue,
        },
      },
    };
    getExecutionContext.mockReturnValue(contextWithOutput);

    const result = await provider.provideCustomHover(createMockModel(), createMockPosition());

    expect(fetchStepExecutionData).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  it('should handle fetchStepExecutionData returning null gracefully', async () => {
    fetchStepExecutionData.mockResolvedValue(null);

    const result = await provider.provideCustomHover(createMockModel(), createMockPosition());

    expect(result).not.toBeNull();
    // Value should be "undefined in the current execution context"
    expect(result!.contents[0]).toEqual(
      expect.objectContaining({
        value: expect.stringContaining('undefined'),
      })
    );
  });

  it('should work without fetchStepExecutionData configured', async () => {
    const config: ProviderConfig = {
      getYamlDocument: () => null,
      getExecutionContext,
      options: { http: {} as any, notifications: {} as any },
    };
    const providerWithoutFetch = new UnifiedHoverProvider(config);

    const result = await providerWithoutFetch.provideCustomHover(
      createMockModel(),
      createMockPosition()
    );

    expect(result).not.toBeNull();
    // No fetcher → no enrichment → value is undefined
    expect(result!.contents[0]).toEqual(
      expect.objectContaining({
        value: expect.stringContaining('undefined'),
      })
    );
  });

  it('should return null when execution context is not available', async () => {
    getExecutionContext.mockReturnValue(null);

    const result = await provider.provideCustomHover(createMockModel(), createMockPosition());

    expect(result).toBeNull();
    expect(fetchStepExecutionData).not.toHaveBeenCalled();
  });

  it('should resolve non-step expressions without calling fetchStepExecutionData', async () => {
    const contextWithInputs: ExecutionContext = {
      inputs: { name: 'test' },
      steps: {},
    };
    getExecutionContext.mockReturnValue(contextWithInputs);

    const inputTemplateInfo = {
      ...templateInfo,
      expression: 'inputs.name',
      variablePath: 'inputs.name',
      pathSegments: ['inputs', 'name'],
      pathUpToCursor: ['inputs', 'name'],
    };
    mockParseTemplateAtPosition.mockReturnValue(inputTemplateInfo);
    evaluateExpression.mockReturnValue('test');

    const result = await provider.provideCustomHover(createMockModel(), createMockPosition());

    expect(fetchStepExecutionData).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  describe('provider ID', () => {
    it('should expose the correct provider ID', () => {
      const idProvider = new UnifiedHoverProvider({ getYamlDocument: () => null });
      expect(idProvider.__providerId).toBe(UNIFIED_HOVER_PROVIDER_ID);
    });
  });

  describe('trigger hover', () => {
    let mockYamlDocument: Record<string, unknown>;

    beforeEach(() => {
      mockYamlDocument = {
        getIn: vi.fn().mockReturnValue(null),
      };
      mockParseTemplateAtPosition.mockReturnValue(null);
    });

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
      (mockModel.getOffsetAt as Mock).mockReturnValue(15); // Inside trigger range

      mockGetTriggerHoverContent.mockReturnValue({ value: '**manual** trigger' });
      mockGetMonacoRangeFromYamlNode.mockReturnValue(new monaco.Range(2, 12, 2, 18));

      const triggerProvider = new UnifiedHoverProvider({
        getYamlDocument: () => mockYamlDocument as never,
      });

      const result = await triggerProvider.provideCustomHover(mockModel, createMockPosition(2, 14));

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
      (mockModel.getOffsetAt as Mock).mockReturnValue(15);

      mockGetTriggerHoverContent.mockReturnValue(null);

      const triggerProvider = new UnifiedHoverProvider({
        getYamlDocument: () => mockYamlDocument as never,
      });

      const result = await triggerProvider.provideCustomHover(mockModel, createMockPosition(2, 14));

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
      (mockModel.getOffsetAt as Mock).mockReturnValue(12);

      const expectedRange = new monaco.Range(2, 12, 2, 17);
      mockGetTriggerHoverContent.mockReturnValue({ value: '**alert** trigger' });
      mockGetMonacoRangeFromYamlNode.mockReturnValue(expectedRange);

      const triggerProvider = new UnifiedHoverProvider({
        getYamlDocument: () => mockYamlDocument as never,
      });

      const result = await triggerProvider.provideCustomHover(mockModel, createMockPosition(2, 12));

      expect(result).not.toBeNull();
      expect(result?.range).toEqual(expectedRange);
    });
  });

  describe('shouldShowConnectorHover', () => {
    let mockYamlDocument: Record<string, unknown>;

    beforeEach(() => {
      mockYamlDocument = {
        getIn: vi.fn().mockReturnValue(null),
      };
      mockParseTemplateAtPosition.mockReturnValue(null);
    });

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
        generateHoverContent: vi.fn().mockResolvedValue({ value: 'noop hover' }),
      };
      mockGetMonacoConnectorHandler.mockReturnValue(mockHandler);

      const connectorProvider = new UnifiedHoverProvider({
        getYamlDocument: () => mockYamlDocument as never,
      });

      const result = await connectorProvider.provideCustomHover(
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

      const connectorProvider = new UnifiedHoverProvider({
        getYamlDocument: () => mockYamlDocument as never,
      });

      const result = await connectorProvider.provideCustomHover(
        createMockModel('steps:\n  - name: test\n    type: noop'),
        createMockPosition(2, 10)
      );

      expect(result).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should return null when provideCustomHover throws', async () => {
      const errorProvider = new UnifiedHoverProvider({
        getYamlDocument: () => {
          throw new Error('YAML parse failed');
        },
      });

      const result = await errorProvider.provideCustomHover(
        createMockModel(),
        createMockPosition()
      );

      expect(result).toBeNull();
    });
  });

  describe('deprecated step hover deduplication', () => {
    it('should let Monaco show the warning marker and only append rich connector info', async () => {
      vi.spyOn(monaco.editor, 'getModelMarkers').mockReturnValue([
        {
          owner: 'custom-yaml-validation',
          source: 'deprecated-step-validation',
          startLineNumber: 2,
          startColumn: 12,
          endLineNumber: 2,
          endColumn: 41,
          message: 'Step type "kibana.createCaseDefaultSpace" is deprecated.',
          severity: monaco.MarkerSeverity.Warning,
        },
      ] as monaco.editor.IMarker[]);
      getInterceptedHover.mockResolvedValue({
        contents: [{ value: 'schema hover' }],
      });

      const mockHandler = {
        generateHoverContent: vi.fn().mockResolvedValue({
          value: 'rich hover',
          isTrusted: true,
        }),
      };
      mockGetMonacoConnectorHandler.mockReturnValue(mockHandler);
      mockGetPathAtOffset.mockReturnValue(['steps', 0, 'type']);
      mockPerformComputation.mockReturnValue({
        workflowLookup: {
          steps: {
            legacy_case: {
              stepId: 'legacy_case',
              stepType: 'kibana.createCaseDefaultSpace',
              lineStart: 1,
              lineEnd: 4,
              isInWithBlock: false,
              stepYamlNode: {},
              propInfos: { type: { valueNode: {} } },
            },
          },
        },
      });

      const deprecatedHoverProvider = new UnifiedHoverProvider({
        getYamlDocument: () =>
          ({
            getIn: vi.fn().mockReturnValue(null),
          } as never),
      });

      const result = await deprecatedHoverProvider.provideHover(
        createMockModel('steps:\n  - type: kibana.createCaseDefaultSpace'),
        createMockPosition(2, 20),
        {} as monaco.CancellationToken
      );

      expect(result).toEqual({
        contents: [
          {
            value: 'rich hover',
            isTrusted: true,
          },
        ],
      });
      expect(mockHandler.generateHoverContent).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorType: 'kibana.createCase',
          stepContext: expect.objectContaining({
            stepType: 'kibana.createCase',
          }),
        })
      );
      expect(getInterceptedHover).not.toHaveBeenCalled();
    });
  });

  describe('provideHover cancellation', () => {
    it('should return null without querying markers when the request is already cancelled', async () => {
      const getModelMarkersSpy = vi.spyOn(monaco.editor, 'getModelMarkers');

      const result = await provider.provideHover(
        createMockModel('type: kibana.createCaseDefaultSpace'),
        createMockPosition(1, 15),
        { isCancellationRequested: true } as monaco.CancellationToken
      );

      expect(result).toBeNull();
      expect(getModelMarkersSpy).not.toHaveBeenCalled();
      expect(getInterceptedHover).not.toHaveBeenCalled();
    });
  });

  describe('createUnifiedHoverProvider', () => {
    it('should return a valid hover provider', () => {
      const createdProvider = createUnifiedHoverProvider({
        getYamlDocument: () => null,
      });

      expect(createdProvider).toBeDefined();
      expect(typeof createdProvider.provideHover).toBe('function');
    });
  });

  describe('registerUnifiedHoverProvider', () => {
    it('should register with Monaco for yaml language', () => {
      const registerSpy = vi
        .spyOn(monaco.languages, 'registerHoverProvider')
        .mockReturnValue({ dispose: vi.fn() });

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
    let mockYamlDocument: Record<string, unknown>;

    beforeEach(() => {
      mockYamlDocument = {
        getIn: vi.fn().mockReturnValue(null),
      };
      mockParseTemplateAtPosition.mockReturnValue(null);
    });

    it('should try to resolve path from line content when getPathAtOffset returns empty', async () => {
      // First getPathAtOffset returns empty, triggering getPathFromCurrentLine
      mockGetPathAtOffset
        .mockReturnValueOnce([]) // Main call - empty
        .mockReturnValueOnce(['steps', 0, 'with']) // Key position attempt
        .mockReturnValueOnce(['steps', 0, 'with']); // Fallback attempts

      mockGetTriggerTypeAtPath.mockReturnValue(null);
      mockPerformComputation.mockReturnValue({ workflowLookup: null });

      const mockModel = createMockModel('    with:');
      (mockModel.getLineContent as Mock).mockReturnValue('    with:');
      (mockModel.getOffsetAt as Mock).mockReturnValue(0);

      const fallbackProvider = new UnifiedHoverProvider({
        getYamlDocument: () => mockYamlDocument as never,
      });

      // Should not crash even though path resolution is complex
      const result = await fallbackProvider.provideCustomHover(mockModel, createMockPosition(4, 9));

      // May return null since no step context is found, but should not throw
      expect(result).toBeNull();
    });
  });
});
