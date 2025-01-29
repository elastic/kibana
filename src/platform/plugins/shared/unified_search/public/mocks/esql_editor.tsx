/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';
import { ESQLEditorProps } from '@kbn/esql-editor';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

const ESQLEditorLazy = React.lazy(() => import('@kbn/esql-editor'));
const ESQLEditor = withSuspense(ESQLEditorLazy);

function createEditor() {
  return (props: ESQLEditorProps) => {
    return (
      <KibanaContextProvider
        services={{
          settings: { client: { get: () => {} } },
          uiSettings: { get: () => {} },
        }}
      >
        <ESQLEditor {...props} />
      </KibanaContextProvider>
    );
  };
}

export const ESQLLangEditor = createEditor();
