/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import 'monaco-editor/esm/vs/base/common/worker/simpleWorker';
import 'monaco-editor/esm/vs/base/worker/defaultWorkerFactory';
import 'monaco-editor/esm/vs/editor/editor.api';

import 'monaco-editor/esm/vs/editor/browser/controller/coreCommands.js';
import 'monaco-editor/esm/vs/editor/browser/widget/codeEditorWidget.js';
import 'monaco-editor/esm/vs/editor/browser/widget/diffEditorWidget.js';
import 'monaco-editor/esm/vs/editor/contrib/bracketMatching/bracketMatching.js';
import 'monaco-editor/esm/vs/editor/contrib/clipboard/clipboard.js';

import 'monaco-editor/esm/vs/language/json/monaco.contribution';

// import 'monaco-editor/esm/vs/language/json/workerManager';
// import 'monaco-editor/esm/vs/language/json/json.worker';
// import 'monaco-editor/esm/vs/language/json/jsonWorker';

// import 'monaco-editor/esm/vs/language/json/jsonMode';
// import 'monaco-editor/esm/vs/language/json/languageFeatures';
// import 'monaco-editor/esm/vs/language/json/tokenization';
