/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { FC, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { XJsonLang } from '@kbn/monaco';
import { omit } from 'lodash';
import { EuiButtonEmpty, EuiCopy, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import { SavedObjectWithMetadata } from '../../../../common';

export interface InspectProps {
  object: SavedObjectWithMetadata<any>;
}
const codeEditorAriaLabel = (title: string) =>
  i18n.translate('savedObjectsManagement.view.inspectCodeEditorAriaLabel', {
    defaultMessage: 'inspect { title }',
    values: {
      title,
    },
  });
const copyToClipboardLabel = i18n.translate('savedObjectsManagement.view.copyToClipboardLabel', {
  defaultMessage: 'Copy to clipboard',
});

export const Inspect: FC<InspectProps> = ({ object }) => {
  const title = object.meta.title || 'saved object';

  const objectAsJsonString = useMemo(() => JSON.stringify(omit(object, 'meta'), null, 2), [object]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <div className="eui-textRight">
          <EuiCopy textToCopy={objectAsJsonString}>
            {(copy) => (
              <EuiButtonEmpty
                aria-label={copyToClipboardLabel}
                size="s"
                flush="right"
                iconType="copyClipboard"
                onClick={copy}
              >
                {copyToClipboardLabel}
              </EuiButtonEmpty>
            )}
          </EuiCopy>
          <EuiSpacer size="s" />
        </div>
        <CodeEditor
          languageId={XJsonLang.ID}
          value={objectAsJsonString}
          aria-label={codeEditorAriaLabel(title)}
          options={{
            automaticLayout: false,
            fontSize: 12,
            lineNumbers: 'on',
            minimap: {
              enabled: false,
            },
            overviewRulerBorder: false,
            readOnly: true,
            scrollbar: {
              alwaysConsumeMouseWheel: false,
            },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            renderIndentGuides: false,
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
