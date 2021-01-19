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

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { OverlayStart } from 'src/core/public';
import type { RuntimeFieldStart } from './types';
import { loadEditor } from './load_editor';
import { IndexPattern, IndexPatternField, DataPublicPluginStart } from '../../data/public';

// eslint-disable-next-line
export interface IndexPatternFieldEditorSetupDependencies {
}

export interface IndexPatternFieldEditorStartDependencies {
  runtimeFields?: RuntimeFieldStart;
}

// eslint-disable-next-line
interface IndexPatternFieldEditorServiceSetup {}

export interface IndexPatternFieldEditorServiceStart {
  loadEditor: () => Promise<
    (
      openFlyout: OverlayStart['openFlyout'],
      indexPattern: IndexPattern,
      indexPatternsService: DataPublicPluginStart['indexPatterns'],
      refreshFields: () => void,
      indexPatternField?: IndexPatternField
    ) => void
  >;
}

export type IndexPatternFieldEditorSetup = IndexPatternFieldEditorServiceSetup;

export type IndexPatternFieldEditorStart = IndexPatternFieldEditorServiceStart;

export class IndexPatternFieldEditorPlugin
  implements
    Plugin<
      IndexPatternFieldEditorSetup,
      IndexPatternFieldEditorStart,
      IndexPatternFieldEditorSetupDependencies,
      IndexPatternFieldEditorStartDependencies
    > {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<IndexPatternFieldEditorStartDependencies, IndexPatternFieldEditorStart>
  ) {
    return {};
  }

  public start(core: CoreStart, plugins: IndexPatternFieldEditorStartDependencies) {
    const { docLinks, uiSettings } = core;
    const { runtimeFields } = plugins;
    return {
      loadEditor: loadEditor(docLinks, uiSettings, runtimeFields?.RuntimeFieldEditor),
    };
  }

  public stop() {}
}
