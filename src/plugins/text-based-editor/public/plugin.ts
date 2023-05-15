/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin } from '@kbn/core/public';
import { TextBasedLanguagesEditor } from './components';
import type { TextBasedEditorPluginStart } from './types';

export class TextBasedEditorPlugin implements Plugin<{}, TextBasedEditorPluginStart> {
  public setup() {
    return {};
  }

  public start(): TextBasedEditorPluginStart {
    return {
      TextBasedLanguagesEditor,
    };
  }

  public stop() {}
}
