/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';
import { TextBasedLanguagesEditorProps } from '@kbn/text-based-editor';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

const TextBasedLanguagesEditorLazy = React.lazy(() => import('@kbn/text-based-editor'));
const TextBasedLanguagesEditor = withSuspense(TextBasedLanguagesEditorLazy);

function createEditor() {
  return (props: TextBasedLanguagesEditorProps) => {
    return (
      <KibanaContextProvider
        services={{
          settings: { client: { get: () => {} } },
          uiSettings: { get: () => {} },
        }}
      >
        <TextBasedLanguagesEditor {...props} />
      </KibanaContextProvider>
    );
  };
}

export const TextBasedLangEditor = createEditor();
