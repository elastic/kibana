/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef, useState } from 'react';
import { EuiPage, EuiPageBody, EuiPageSection, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { EuiProvider } from '@elastic/eui';

import type { CoreStart } from '@kbn/core/public';

import { EditorError, ESQLAstQueryExpression, parse } from '@kbn/esql-ast';
import { CodeEditor } from '@kbn/code-editor';
import type { StartDependencies } from './plugin';
import { PrettyPrint } from './pretty_print';
import { EsqlInspector } from './components/esql_inspector';

export const App = (props: { core: CoreStart; plugins: StartDependencies }) => {
  const [currentErrors, setErrors] = useState<EditorError[]>([]);
  const [currentQuery, setQuery] = useState(
    'from index1 | eval var0 = round(numberField, 2) | stats by stringField'
  );

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const [root, setAST] = useState<ESQLAstQueryExpression>(
    parse(currentQuery, { withFormatting: true }).root
  );

  return (
    <EuiProvider>
      <EuiPage>
        <EuiPageBody style={{ maxWidth: 1200, margin: '0 auto' }}>
          <EuiPageHeader paddingSize="s" bottomBorder={true} pageTitle="ES|QL AST Inspector" />
          <EuiPageSection paddingSize="s">
            <p>This app gives you the AST for a particular ES|QL query.</p>
            <EuiSpacer />
            <EsqlInspector />
            <EuiSpacer />
            <PrettyPrint src={currentQuery} />
            <EuiSpacer />
            <CodeEditor
              allowFullScreen={true}
              languageId={'json'}
              value={JSON.stringify(root, null, 2)}
            />
          </EuiPageSection>
        </EuiPageBody>
      </EuiPage>
    </EuiProvider>
  );
};
