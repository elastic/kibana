/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/* eslint-disable @kbn/eslint/module_migration */

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import 'monaco-editor/esm/vs/base/common/worker/simpleWorker';
import 'monaco-editor/esm/vs/base/worker/defaultWorkerFactory';

import 'monaco-editor/esm/vs/editor/browser/controller/coreCommands.js';
import 'monaco-editor/esm/vs/editor/browser/widget/codeEditorWidget.js';

import 'monaco-editor/esm/vs/editor/contrib/wordOperations/wordOperations.js'; // Needed for word-wise char navigation

import 'monaco-editor/esm/vs/editor/contrib/suggest/suggestController.js'; // Needed for suggestions
import 'monaco-editor/esm/vs/editor/contrib/hover/hover.js'; // Needed for hover
import 'monaco-editor/esm/vs/editor/contrib/parameterHints/parameterHints.js'; // Needed for signature

export { monaco };
