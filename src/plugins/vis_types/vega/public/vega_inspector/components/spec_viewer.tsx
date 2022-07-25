/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { XJsonLang } from '@kbn/monaco';

import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiCopy,
  EuiButtonEmpty,
  EuiSpacer,
  CommonProps,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import { VegaAdapter } from '../vega_adapter';

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
          languageId={XJsonLang.ID}
          value={spec}
          options={{
            readOnly: true,
            lineNumbers: 'off',
            fontSize: 12,
            minimap: {
              enabled: false,
            },
            scrollBeyondLastLine: false,
            folding: true,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            automaticLayout: true,
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
