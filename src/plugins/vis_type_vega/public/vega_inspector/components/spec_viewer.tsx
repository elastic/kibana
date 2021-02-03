/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiCopy,
  EuiButtonEmpty,
  EuiSpacer,
  CommonProps,
} from '@elastic/eui';
import { VegaAdapter } from '../vega_adapter';
import { CodeEditor } from '../../../../kibana_react/public';

interface SpecViewerProps extends CommonProps {
  vegaAdapter: VegaAdapter;
}

const copyToClipboardLabel = i18n.translate(
  'visTypeVega.inspector.specViewer.copyToClipboardLabel',
  {
    defaultMessage: 'Copy to clipboard',
  }
);

export const SpecViewer = ({ vegaAdapter, ...rest }: SpecViewerProps) => {
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
    <EuiFlexGroup direction="column" gutterSize="s" wrap={false} responsive={false} {...rest}>
      <EuiFlexItem grow={false}>
        <EuiSpacer size="s" />
        <div className="eui-textRight">
          <EuiCopy textToCopy={spec}>
            {(copy) => (
              <EuiButtonEmpty
                size="xs"
                flush="right"
                iconType="copyClipboard"
                onClick={copy}
                data-test-subj="vegaDataInspectorCopyClipboardButton"
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
          value={spec}
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
};
