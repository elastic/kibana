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
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiFlexGroup, EuiCopy, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';

import { CodeEditor } from '../../../../../../kibana_react/public';

interface RequestCodeViewerProps {
  json: string;
}

const copyToClipboardLabel = i18n.translate('inspector.requests.copyToClipboardLabel', {
  defaultMessage: 'Copy to clipboard',
});

/**
 * @internal
 */
export const RequestCodeViewer = ({ json }: RequestCodeViewerProps) => (
  <EuiFlexGroup
    direction="column"
    gutterSize="s"
    wrap={false}
    responsive={false}
    className="insRequestCodeViewer"
  >
    <EuiFlexItem grow={false}>
      <EuiSpacer size="s" />
      <div className="eui-textRight">
        <EuiCopy textToCopy={json}>
          {(copy) => (
            <EuiButtonEmpty
              size="xs"
              flush="right"
              iconType="copyClipboard"
              onClick={copy}
              data-test-subj="inspectorRequestCopyClipboardButton"
            >
              {copyToClipboardLabel}
            </EuiButtonEmpty>
          )}
        </EuiCopy>
      </div>
    </EuiFlexItem>
    <EuiFlexItem grow={true}>
      <CodeEditor
        languageId="json"
        value={json}
        onChange={() => {}}
        options={{
          readOnly: true,
          lineNumbers: 'off',
          fontSize: 12,
          minimap: {
            enabled: false,
          },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          wrappingIndent: 'indent',
          automaticLayout: true,
        }}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
