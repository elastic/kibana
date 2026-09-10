/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import type { monaco } from '@kbn/code-editor';
import type { ESQLCallbacks, ESQLTelemetryCallbacks } from '@kbn/esql-types';
import { useEditorConfig } from './use_editor_config';

const defaultParams = () => ({
  editorRef: { current: undefined } as MutableRefObject<
    monaco.editor.IStandaloneCodeEditor | undefined
  >,
  editorModel: { current: undefined } as MutableRefObject<monaco.editor.ITextModel | undefined>,
  editorModelUriRef: { current: undefined } as MutableRefObject<string | undefined>,
  editorCommandDisposables: {
    current: new WeakMap(),
  } as MutableRefObject<WeakMap<monaco.editor.IStandaloneCodeEditor, monaco.IDisposable[]>>,
  esqlCallbacks: {} as ESQLCallbacks,
  telemetryCallbacks: {} as ESQLTelemetryCallbacks,
  isSuggestFixEnabled: false,
  isDisabled: false,
  measuredEditorWidth: 800,
  setMeasuredEditorWidth: jest.fn(),
  resetPendingTracking: jest.fn(),
  editorMessagesRef: { current: { errors: [], warnings: [] } },
});

describe('useEditorConfig', () => {
  it('does not consume mouse wheel so nested flyouts can scroll', () => {
    const { result } = renderHook(() => useEditorConfig(defaultParams()));

    expect(result.current.codeEditorOptions.scrollbar?.alwaysConsumeMouseWheel).toBe(false);
  });
});
