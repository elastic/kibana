/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { monaco } from '@kbn/monaco';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { of } from 'rxjs';
import {
  useLookupIndexCommand,
  useCanCreateLookupIndex,
  getMonacoCommandString,
} from './use_lookup_index_editor';
import { useLookupIndexPrivileges } from './use_lookup_index_privileges';
import { coreMock } from '@kbn/core/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import type { TriggerContract } from '@kbn/ui-actions-plugin/public/triggers';
import { getLookupIndicesFromQuery } from '@kbn/esql-utils';
import {
  appendIndexToJoinCommandByName,
  appendIndexToJoinCommandByPosition,
} from './append_index_to_join_command';

// Mock dependencies
jest.mock('@kbn/esql-utils', () => ({
  getLookupIndicesFromQuery: jest.fn(),
}));

jest.mock('./use_lookup_index_privileges', () => ({
  useLookupIndexPrivileges: jest.fn(),
}));

jest.mock('./append_index_to_join_command', () => ({
  appendIndexToJoinCommandByName: jest.fn(),
  appendIndexToJoinCommandByPosition: jest.fn(),
}));

jest.mock('@kbn/react-hooks', () => ({
  useDebounceFn: jest.fn((fn) => ({ run: fn })),
}));

jest.mock('@elastic/eui', () => ({
  useEuiTheme: () => ({
    euiTheme: {
      colors: { textParagraph: '#000' },
      border: { width: { thick: '2px' } },
    },
  }),
}));

const mockServices = {
  ...coreMock.createStart(),
  uiActions: uiActionsPluginMock.createStartContract(),
};

const createWrapper = ({ children }: { children: React.ReactNode }) => (
  <KibanaContextProvider services={mockServices}>{children}</KibanaContextProvider>
);

describe('getMonacoCommandString', () => {
  it('should return create command for non-existing index with create permissions', () => {
    const result = getMonacoCommandString('test-index', false, {
      canCreateIndex: true,
      canEditIndex: true,
    });
    expect(result).toBe(
      '[Create lookup index](command:esql.lookup_index.create?%7B%22indexName%22%3A%22test-index%22%2C%22doesIndexExist%22%3Afalse%2C%22canEditIndex%22%3Atrue%2C%22triggerSource%22%3A%22esql_hover%22%7D)'
    );
  });

  it('should return edit command for existing index with edit permissions', () => {
    const result = getMonacoCommandString('test-index', true, { canEditIndex: true });
    expect(result).toBe(
      '[Edit lookup index](command:esql.lookup_index.create?%7B%22indexName%22%3A%22test-index%22%2C%22doesIndexExist%22%3Atrue%2C%22canEditIndex%22%3Atrue%2C%22triggerSource%22%3A%22esql_hover%22%7D)'
    );
  });

  it('should return view command for existing index with read permissions only', () => {
    const result = getMonacoCommandString('test-index', true, {
      canReadIndex: true,
      canEditIndex: false,
    });
    expect(result).toBe(
      '[View lookup index](command:esql.lookup_index.create?%7B%22indexName%22%3A%22test-index%22%2C%22doesIndexExist%22%3Atrue%2C%22canEditIndex%22%3Afalse%2C%22triggerSource%22%3A%22esql_hover%22%7D)'
    );
  });

  it('should return undefined when no permissions', () => {
    const result = getMonacoCommandString('test-index', false, { canCreateIndex: false });
    expect(result).toBeUndefined();
  });
});

describe('useCanCreateLookupIndex', () => {
  const mockGetPermissions = jest.fn();

  beforeEach(() => {
    mockServices.application.currentAppId$ = of('discover');
    (useLookupIndexPrivileges as jest.Mock).mockReturnValue({
      getPermissions: mockGetPermissions,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when user has create permissions', async () => {
    mockGetPermissions.mockResolvedValue({
      'test-index': { canCreateIndex: true },
    });

    const { result } = renderHook(() => useCanCreateLookupIndex(), {
      wrapper: createWrapper,
    });

    const canCreate = await result.current('test-index');
    expect(canCreate).toBe(true);
  });

  it('should return false when user lacks create permissions', async () => {
    mockGetPermissions.mockResolvedValue({
      'test-index': { canCreateIndex: false },
    });

    const { result } = renderHook(() => useCanCreateLookupIndex(), {
      wrapper: createWrapper,
    });

    const canCreate = await result.current('test-index');
    expect(canCreate).toBe(false);
  });

  it('should return false when not in supported app', async () => {
    mockServices.application.currentAppId$ = of('dashboard');

    const { result } = renderHook(() => useCanCreateLookupIndex(), { wrapper: createWrapper });

    const canCreate = await result.current('test-index');
    expect(canCreate).toBe(false);
  });
});

describe('useLookupIndexCommand', () => {
  const mockEditorRef = { current: undefined } as React.MutableRefObject<
    monaco.editor.IStandaloneCodeEditor | undefined
  >;
  const mockEditorModel = { current: undefined } as React.MutableRefObject<
    monaco.editor.ITextModel | undefined
  >;
  const mockGetLookupIndices = jest.fn();
  const mockOnIndexCreated = jest.fn();
  const mockGetPermissions = jest.fn();
  const mockQuery = { esql: 'FROM logs | LOOKUP JOIN test-index ON field' };

  const mockEditor = {
    getPosition: jest.fn(),
    createDecorationsCollection: jest.fn(),
    getLineDecorations: jest.fn(() => []),
    removeDecorations: jest.fn(),
  } as any;

  const mockModel = {
    getLineCount: jest.fn(() => 5),
    findMatches: jest.fn(() => [
      { range: { startLineNumber: 1, endLineNumber: 1, startColumn: 1, endColumn: 10 } },
    ]),
    deltaDecorations: jest.fn(() => ['decoration-1']),
  } as any;

  beforeEach(() => {
    jest.useFakeTimers();

    mockServices.application.currentAppId$ = of('discover');

    (useLookupIndexPrivileges as jest.Mock).mockReturnValue({
      getPermissions: mockGetPermissions,
    });

    (getLookupIndicesFromQuery as jest.Mock).mockReturnValue(['test-index']);

    mockEditorRef.current = mockEditor;
    mockEditorModel.current = mockModel;

    mockGetLookupIndices.mockResolvedValue({
      indices: [{ name: 'existing-index' }],
    });

    mockGetPermissions.mockResolvedValue({
      'test-index': { canCreateIndex: true, canEditIndex: false, canReadIndex: false },
    });

    const mockTrigger = {
      exec: jest.fn(),
    } as unknown as jest.Mocked<TriggerContract>;
    mockServices.uiActions.getTrigger.mockReturnValue(mockTrigger);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should register monaco command on mount', () => {
    const registerCommandSpy = jest.spyOn(monaco.editor, 'registerCommand');

    renderHook(
      () =>
        useLookupIndexCommand(
          mockEditorRef,
          mockEditorModel,
          mockGetLookupIndices,
          mockQuery,
          mockOnIndexCreated
        ),
      { wrapper: createWrapper }
    );

    expect(registerCommandSpy).toHaveBeenCalledWith(
      'esql.lookup_index.create',
      expect.any(Function)
    );
  });

  it('should add decorations for lookup indices', async () => {
    const { result } = renderHook(
      () =>
        useLookupIndexCommand(
          mockEditorRef,
          mockEditorModel,
          mockGetLookupIndices,
          mockQuery,
          mockOnIndexCreated
        ),
      { wrapper: createWrapper }
    );

    result.current.addLookupIndicesDecorator();

    await jest.advanceTimersByTimeAsync(600);

    expect(mockModel.deltaDecorations).toHaveBeenCalledWith(
      [],
      expect.arrayContaining([
        expect.objectContaining({
          options: expect.objectContaining({
            hoverMessage: expect.objectContaining({
              value:
                '[Create lookup index](command:esql.lookup_index.create?%7B%22indexName%22%3A%22test-index%22%2C%22doesIndexExist%22%3Afalse%2C%22canEditIndex%22%3Afalse%2C%22triggerSource%22%3A%22esql_hover%22%7D)',
            }),
          }),
        }),
      ])
    );
  });

  it('should handle flyout close with index creation', async () => {
    (appendIndexToJoinCommandByName as jest.Mock).mockReturnValue(
      'FROM logs | JOIN new-index ON field'
    );

    renderHook(
      () =>
        useLookupIndexCommand(
          mockEditorRef,
          mockEditorModel,
          mockGetLookupIndices,
          mockQuery,
          mockOnIndexCreated
        ),
      { wrapper: createWrapper }
    );

    // Access the private onFlyoutClose function through the openFlyout mechanism
    const trigger = mockServices.uiActions.getTrigger('EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID');
    (trigger.exec as jest.Mock).mockImplementation(async (context) => {
      await context.onClose({
        indexName: 'new-index',
        indexCreatedDuringFlyout: true,
      });
    });

    // Trigger the command
    const registerCommandCall = jest.mocked(monaco.editor.registerCommand).mock.calls[0];
    const commandHandler = registerCommandCall[1];

    await commandHandler(undefined, {
      indexName: 'test-index',
      doesIndexExist: false,
      canEditIndex: false,
    });

    expect(mockOnIndexCreated).toHaveBeenCalledWith('FROM logs | JOIN new-index ON field');
  });

  it('should handle cursor position when no initial index name', async () => {
    (appendIndexToJoinCommandByPosition as jest.Mock).mockReturnValue(
      'FROM logs | LOOKUP JOIN cursor-index ON field'
    );

    mockEditor.getPosition.mockReturnValue({ lineNumber: 1, column: 15 });

    renderHook(
      () =>
        useLookupIndexCommand(
          mockEditorRef,
          mockEditorModel,
          mockGetLookupIndices,
          mockQuery,
          mockOnIndexCreated
        ),
      { wrapper: createWrapper }
    );

    const trigger = mockServices.uiActions.getTrigger('EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID');
    (trigger.exec as jest.Mock).mockImplementation(async (context) => {
      await context.onClose({
        indexName: 'cursor-index',
        indexCreatedDuringFlyout: true,
      });
    });

    const registerCommandCall = jest.mocked(monaco.editor.registerCommand).mock.calls[0];
    const commandHandler = registerCommandCall[1];

    await commandHandler(undefined, {
      indexName: undefined,
      doesIndexExist: false,
      canEditIndex: false,
    });

    expect(appendIndexToJoinCommandByPosition).toHaveBeenCalledWith(
      mockQuery.esql,
      { lineNumber: 1, column: 15 },
      'cursor-index'
    );
  });

  it('should throw error when no cursor position and no index name', async () => {
    mockEditor.getPosition.mockReturnValue(null);

    renderHook(
      () =>
        useLookupIndexCommand(
          mockEditorRef,
          mockEditorModel,
          mockGetLookupIndices,
          mockQuery,
          mockOnIndexCreated
        ),
      { wrapper: createWrapper }
    );

    const trigger = mockServices.uiActions.getTrigger('EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID');

    await expect(async () => {
      (trigger.exec as jest.Mock).mockImplementation(async (context) => {
        await context.onClose({
          indexName: 'new-index',
          indexCreatedDuringFlyout: true,
        });
      });

      const registerCommandCall = jest.mocked(monaco.editor.registerCommand).mock.calls[0];
      const commandHandler = registerCommandCall[1];

      await commandHandler(undefined, {
        indexName: '',
        doesIndexExist: false,
        canEditIndex: false,
      });
    }).rejects.toThrow('Could not find a cursor position in the editor');
  });

  it('should not call onIndexCreated when index is not created', async () => {
    renderHook(
      () =>
        useLookupIndexCommand(
          mockEditorRef,
          mockEditorModel,
          mockGetLookupIndices,
          mockQuery,
          mockOnIndexCreated
        ),
      { wrapper: createWrapper }
    );

    const trigger = mockServices.uiActions.getTrigger('EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID');
    (trigger.exec as jest.Mock).mockImplementation(async (context) => {
      await context.onClose({
        indexName: null,
        indexCreatedDuringFlyout: false,
      });
    });

    const registerCommandCall = jest.mocked(monaco.editor.registerCommand).mock.calls[0];
    const commandHandler = registerCommandCall[1];

    await commandHandler(undefined, {
      indexName: 'test-index',
      doesIndexExist: false,
      canEditIndex: false,
    });

    expect(mockOnIndexCreated).not.toHaveBeenCalled();
  });

  it('should return early when not in supported app', async () => {
    mockServices.application.currentAppId$ = of('dashboard');

    const { result } = renderHook(
      () =>
        useLookupIndexCommand(
          mockEditorRef,
          mockEditorModel,
          mockGetLookupIndices,
          mockQuery,
          mockOnIndexCreated
        ),
      { wrapper: createWrapper }
    );

    const decoratorResult = await result.current.addLookupIndicesDecorator();
    expect(decoratorResult).toBe(false);
    expect(mockModel.deltaDecorations).not.toHaveBeenCalled();
  });
});
