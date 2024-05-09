/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageSection,
  EuiPageHeader,
  EuiSpacer,
  EuiForm,
  EuiTextArea,
  EuiFormRow,
} from '@elastic/eui';

import type { CoreStart } from '@kbn/core/public';

import { EditorError, ESQLAst, getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { CodeEditor } from '@kbn/code-editor';
import type { StartDependencies } from './plugin';

export const App = (props: { core: CoreStart; plugins: StartDependencies }) => {
  const [currentErrors, setErrors] = useState<EditorError[]>([]);
  const [currentQuery, _setQuery] = useState(
    'from index1 | eval var0 = round(numberField, 2) | stats by stringField'
  );

  const [ast, setAST] = useState<ESQLAst>(getAstAndSyntaxErrors(currentQuery).ast);

  const setQuery = (query: string) => {
    const { ast: _ast, errors } = getAstAndSyntaxErrors(query);
    _setQuery(query);
    setErrors(errors);
    setAST(_ast);
  };

  return (
    <EuiPage>
      <EuiPageBody style={{ maxWidth: 800, margin: '0 auto' }}>
        <EuiPageHeader paddingSize="s" bottomBorder={true} pageTitle="ES|QL AST Inspector" />
        <EuiPageSection paddingSize="s">
          <p>This app gives you the AST for a particular ES|QL query.</p>

          <EuiSpacer />

          <EuiForm>
            <EuiFormRow
              fullWidth
              label="Query"
              isInvalid={Boolean(currentErrors.length)}
              error={currentErrors.map((error) => error.message)}
            >
              <EuiTextArea
                isInvalid={Boolean(currentErrors.length)}
                fullWidth
                value={currentQuery}
                onChange={(e) => setQuery(e.target.value)}
                css={{
                  height: '5em',
                }}
              />
            </EuiFormRow>
          </EuiForm>
          <EuiSpacer />
          <CodeEditor
            allowFullScreen={true}
            languageId={'json'}
            value={JSON.stringify(ast, null, 2)}
          />
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
};
