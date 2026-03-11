/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type { ProviderConfig } from './provider_interfaces';
import { UnifiedHoverProvider } from './unified_hover_provider';
import type {
  ExecutionContext,
  StepExecutionData,
} from '../execution_context/build_execution_context';

jest.mock('../template_expression/parse_template_at_position');
jest.mock('../template_expression/evaluate_expression');
jest.mock('../hover/get_intercepted_hover', () => ({
  getInterceptedHover: jest.fn().mockResolvedValue(null),
}));

const { parseTemplateAtPosition } = jest.requireMock(
  '../template_expression/parse_template_at_position'
);
const { evaluateExpression } = jest.requireMock('../template_expression/evaluate_expression');

const createMockModel = () =>
  ({
    uri: { toString: () => 'inmemory://test' },
    getLineContent: jest.fn().mockReturnValue('  message: "{{ steps.search.output.hits }}"'),
    getLineDecorations: jest.fn().mockReturnValue([]),
  } as unknown as monaco.editor.ITextModel);

const createMockPosition = (line = 1, column = 25) => new monaco.Position(line, column);

describe('UnifiedHoverProvider - lazy-loading step I/O', () => {
  let fetchStepExecutionData: jest.Mock;
  let getExecutionContext: jest.Mock;
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
    jest.clearAllMocks();

    fetchStepExecutionData = jest.fn().mockResolvedValue(enrichedStepData);
    getExecutionContext = jest.fn().mockReturnValue(baseExecutionContext);

    // parseTemplateAtPosition returns our template info for every call
    parseTemplateAtPosition.mockReturnValue(templateInfo);
    // evaluateExpression resolves the value from the (enriched) context
    evaluateExpression.mockImplementation(
      ({ expression, context }: { expression: string; context: ExecutionContext }) => {
        if (expression === 'steps.search.output.hits' && context.steps.search?.output) {
          return (context.steps.search.output as Record<string, unknown>).hits;
        }
        return undefined;
      }
    );

    // Suppress validation markers and line decorations
    (monaco.editor.getModelMarkers as jest.Mock) = jest.fn().mockReturnValue([]);

    const config: ProviderConfig = {
      getYamlDocument: () => null,
      getExecutionContext,
      fetchStepExecutionData,
      options: { http: {} as any, notifications: {} as any },
    };
    provider = new UnifiedHoverProvider(config);
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
    parseTemplateAtPosition.mockReturnValue(inputTemplateInfo);
    evaluateExpression.mockReturnValue('test');

    const result = await provider.provideCustomHover(createMockModel(), createMockPosition());

    expect(fetchStepExecutionData).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
  });
});
