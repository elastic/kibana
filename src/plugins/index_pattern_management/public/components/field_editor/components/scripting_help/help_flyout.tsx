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

import React from 'react';
import { EuiFlyout, EuiFlyoutBody, EuiTabbedContent } from '@elastic/eui';

import { ScriptingSyntax } from './scripting_syntax';
import { TestScript } from './test_script';

import { ExecuteScript } from '../../types';
import { IndexPattern } from '../../../../../../data/public';

interface ScriptingHelpFlyoutProps {
  indexPattern: IndexPattern;
  lang: string;
  name?: string;
  script?: string;
  executeScript: ExecuteScript;
  isVisible: boolean;
  onClose: () => void;
}

export const ScriptingHelpFlyout: React.FC<ScriptingHelpFlyoutProps> = ({
  isVisible = false,
  onClose = () => {},
  indexPattern,
  lang,
  name,
  script,
  executeScript,
}) => {
  const tabs = [
    {
      id: 'syntax',
      name: 'Syntax',
      ['data-test-subj']: 'syntaxTab',
      content: <ScriptingSyntax />,
    },
    {
      id: 'test',
      name: 'Preview results',
      ['data-test-subj']: 'testTab',
      content: (
        <TestScript
          indexPattern={indexPattern}
          lang={lang}
          name={name}
          script={script}
          executeScript={executeScript}
        />
      ),
    },
  ];

  return isVisible ? (
    <EuiFlyout onClose={onClose} data-test-subj="scriptedFieldsHelpFlyout">
      <EuiFlyoutBody>
        <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />
      </EuiFlyoutBody>
    </EuiFlyout>
  ) : null;
};

ScriptingHelpFlyout.displayName = 'ScriptingHelpFlyout';
