/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { TextBasedLanguagesEditor, TextBasedLanguagesEditorProps } from '@kbn/text-based-editor';

interface StatefulEditorDeps {
  core: CoreStart;
}

export function createEditor({ core }: StatefulEditorDeps) {
  return (props: TextBasedLanguagesEditorProps) => {
    return (
      <KibanaContextProvider
        services={{
          ...core,
        }}
      >
        <TextBasedLanguagesEditor {...props} isDarkMode={core.uiSettings.get('theme:darkMode')} />
      </KibanaContextProvider>
    );
  };
}
