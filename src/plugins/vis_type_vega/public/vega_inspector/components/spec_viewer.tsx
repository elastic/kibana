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
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

import 'brace/mode/json';

import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiCopy,
  EuiButtonIcon,
  EuiSpacer,
  EuiCodeEditor,
  EuiToolTip,
} from '@elastic/eui';
import { VegaAdapter } from '../vega_adapter';

interface SpecViewerProps {
  vegaAdapter: VegaAdapter;
}

const copyToClipboardLabel = i18n.translate(
  'visTypeVega.inspector.specViewer.copyToClipboardLabel',
  {
    defaultMessage: 'Click to copy to clipboard',
  }
);

export const SpecViewer = ({ vegaAdapter }: SpecViewerProps) => {
  const [spec, setSpec] = useState<string>();

  useEffect(() => {
    const subscription = vegaAdapter.getSpecSubscription().subscribe((data) => {
      if (data) {
        setSpec(data);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [vegaAdapter]);

  if (!spec) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s" className="insVegaView" wrap={false}>
      <EuiFlexItem className="eui-textRight" grow={false}>
        <EuiSpacer size="s" />
        <EuiCopy textToCopy={spec}>
          {(copy) => (
            <EuiToolTip content={copyToClipboardLabel} delay="long">
              <EuiButtonIcon iconType="copyClipboard" onClick={copy} />
            </EuiToolTip>
          )}
        </EuiCopy>
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <EuiCodeEditor
          mode="json"
          width="100%"
          height="100%"
          value={spec}
          setOptions={{
            showLineNumbers: false,
            tabSize: 2,
          }}
          isReadOnly
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
