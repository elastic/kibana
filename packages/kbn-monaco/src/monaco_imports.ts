/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @kbn/eslint/module_migration */
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import 'monaco-editor/esm/vs/base/common/worker/simpleWorker';
import 'monaco-editor/esm/vs/base/worker/defaultWorkerFactory';

import 'monaco-editor/esm/vs/editor/browser/controller/coreCommands.js';
import 'monaco-editor/esm/vs/editor/browser/widget/codeEditorWidget.js';

import 'monaco-editor/esm/vs/editor/contrib/wordOperations/wordOperations.js'; // Needed for word-wise char navigation
import 'monaco-editor/esm/vs/editor/contrib/linesOperations/linesOperations.js'; // Needed for enabling shortcuts of removing/joining/moving lines
import 'monaco-editor/esm/vs/editor/contrib/folding/folding.js'; // Needed for folding
import 'monaco-editor/esm/vs/editor/contrib/suggest/suggestController.js'; // Needed for suggestions
import 'monaco-editor/esm/vs/editor/contrib/hover/hover.js'; // Needed for hover
import 'monaco-editor/esm/vs/editor/contrib/parameterHints/parameterHints.js'; // Needed for signature
import 'monaco-editor/esm/vs/editor/contrib/bracketMatching/bracketMatching.js'; // Needed for brackets matching highlight

import 'monaco-editor/esm/vs/language/json/monaco.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js'; // Needed for basic javascript support
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution.js'; // Needed for basic xml support
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution'; // Needed for yaml support

export { monaco };
