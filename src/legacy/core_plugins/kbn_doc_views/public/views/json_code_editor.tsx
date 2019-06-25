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
// @ts-ignore
import { EuiCodeEditor } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

export interface JsonCodeEditorProps {
  hit: Record<string, any>;
}

export function JsonCodeEditor({ hit }: JsonCodeEditorProps) {
  return (
    <EuiCodeEditor
      aria-label={
        <FormattedMessage
          id="kbnDocViews.json.codeEditorAriaLabel"
          defaultMessage="Read only JSON view of an elasticsearch document"
        />
      }
      isReadOnly
      mode="json"
      setOptions={{
        showPrintMargin: false,
        minLines: 20,
        maxLines: Infinity,
        highlightActiveLine: false,
      }}
      theme="textmate"
      value={JSON.stringify(hit, null, 2)}
      width="100%"
    />
  );
}
