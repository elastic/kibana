/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import { MockedCodeEditor } from './code_editor_mock';

// Only imported by Vitest unit tests; vi.mock is hoisted within this module, so importing the
// helper first in a test file mocks @kbn/code-editor for everything imported after it.
vi.mock('@kbn/code-editor', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  CodeEditorField: MockedCodeEditor,
  CodeEditor: MockedCodeEditor,
}));
