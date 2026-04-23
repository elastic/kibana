/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

/**
 * A mock `@kbn/code-editor` module that replaces `CodeEditor` with a plain `<textarea>`.
 *
 * Usage in test files:
 * ```ts
 * import { mockCodeEditorModule } from '../../shared/test_utils';
 * jest.mock('@kbn/code-editor', () => mockCodeEditorModule);
 * ```
 */
export const mockCodeEditorModule = {
  CodeEditor: (props: {
    value?: string;
    onChange?: (value: string) => void;
    dataTestSubj?: string;
    'aria-label'?: string;
    options?: { readOnly?: boolean };
  }) =>
    React.createElement('textarea', {
      'data-test-subj': props.dataTestSubj || 'code-editor',
      value: props.value,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => props.onChange?.(e.target.value),
      readOnly: props.options?.readOnly,
      'aria-label': props['aria-label'],
    }),
  monaco: {
    languages: {
      json: {
        jsonDefaults: {
          setDiagnosticsOptions: jest.fn(),
        },
      },
    },
    editor: {},
  },
};
