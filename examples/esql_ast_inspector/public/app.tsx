/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { JSONTree } from 'react-json-tree';
import React, { useState } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageSection,
  EuiPageHeader,
  EuiSpacer,
  EuiForm,
  EuiButtonGroup,
  EuiTextArea,
  EuiFormRow,
} from '@elastic/eui';

import type { CoreStart } from '@kbn/core/public';

import { ESQLAst, getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { CodeEditor } from '@kbn/code-editor';
import type { StartDependencies } from './plugin';

const theme = {
  scheme: 'monokai',
  author: 'wimer hazenberg (http://www.monokai.nl)',
  base00: '#272822',
  base01: '#383830',
  base02: '#49483e',
  base03: '#75715e',
  base04: '#a59f85',
  base05: '#f8f8f2',
  base06: '#f5f4f1',
  base07: '#f9f8f5',
  base08: '#f92672',
  base09: '#fd971f',
  base0A: '#f4bf75',
  base0B: '#a6e22e',
  base0C: '#a1efe4',
  base0D: '#66d9ef',
  base0E: '#ae81ff',
  base0F: '#cc6633',
};

export const App = (props: { core: CoreStart; plugins: StartDependencies }) => {
  const [currentErrors, setErrors] = useState<string[]>([]);
  const [currentWarnings, setWarnings] = useState<string[]>([]);
  const [currentQuery, setQuery] = useState(
    'from index1 | eval var0 = round(numberField, 2) | stats by stringField'
  );

  const [ast, setAST] = useState<ESQLAst>(getAstAndSyntaxErrors(currentQuery).ast);

  const [useTree, setUseTree] = useState(false);

  return (
    <EuiPage>
      <EuiPageBody style={{ maxWidth: 800, margin: '0 auto' }}>
        <EuiPageHeader paddingSize="s" bottomBorder={true} pageTitle="ES|QL AST Inspector" />
        <EuiPageSection paddingSize="s">
          <p>This app gives you the AST for a particular ES|QL query.</p>

          <EuiSpacer />

          <EuiForm>
            <EuiFormRow fullWidth label="Query">
              <EuiTextArea
                fullWidth
                value={currentQuery}
                onChange={(e) => setQuery(e.target.value)}
              />
            </EuiFormRow>
            <EuiFormRow fullWidth label="Display">
              <EuiButtonGroup
                idSelected={useTree ? 'tree' : 'json'}
                buttonSize="s"
                onChange={(id: string) => setUseTree(id === 'tree')}
                legend="Theme"
                options={[
                  {
                    id: 'json',
                    label: 'JSON',
                  },
                  {
                    id: 'tree',
                    label: 'Tree',
                  },
                ]}
              />
            </EuiFormRow>
          </EuiForm>
          <EuiSpacer />
          {useTree ? (
            <JSONTree
              data={ast}
              theme={theme}
              invertTheme={true}
              shouldExpandNodeInitially={(nodes) => {
                return nodes.length < 3;
              }}
            />
          ) : (
            <CodeEditor height={700} languageId={'json'} value={JSON.stringify(ast, null, 2)} />
          )}
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
};
