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

/* eslint-disable-next-line @kbn/eslint/module_migration */
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import * as xJson from './xjson';
import * as esql from './esql';
import * as painless from './painless';

export const registerLexerRules = (m: typeof monaco) => {
  m.languages.register({ id: xJson.ID });
  m.languages.setMonarchTokensProvider(xJson.ID, xJson.lexerRules);
  m.languages.register({ id: painless.ID });
  m.languages.setMonarchTokensProvider(painless.ID, painless.lexerRules);
  m.languages.register({ id: esql.ID });
  m.languages.setMonarchTokensProvider(esql.ID, esql.lexerRules);
};
