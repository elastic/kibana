/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  // EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiMarkdownEditor,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
// import type { EuiMarkdownEditorUiPluginEditorProps } from '@elastic/eui/src/components/markdown_editor/markdown_types';
import { RuleTypeParams, RuleTypeParamsExpressionProps } from '@kbn/alerts-ui-shared';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';

// const dropHandlers = [
//   {
//     supportedFiles: ['.jpg', '.jpeg'],
//     accepts: (itemType) => itemType === 'image/jpeg',
//     getFormattingForItem: (item) => {
//       // fake an upload
//       return new Promise((resolve) => {
//         setTimeout(() => {
//           const url = URL.createObjectURL(item);
//           resolve({
//             text: `![${item.name}](${url})`,
//             config: { block: true },
//           });
//         }, 1000);
//       });
//     },
//   },
// ];

// function plugin() {
//   return {
//     name: 'test-plugin',
//     button: {
//       label: 'Test',
//       iconType: 'observabilityApp',
//       isDisabled: false,
//     },
//     helpText: (
//       <div>
//         <p>Test plugin</p>
//       </div>
//     ),
//     editor: React.memo(function TestPlugin(props: EuiMarkdownEditorUiPluginEditorProps) {
//       const { onCancel } = props;
//       console.log('props', props);
//       return (
//         <div>
//           I am a test editor <EuiButton onClick={onCancel}>Close</EuiButton>
//         </div>
//       );
//     }),
//   };
// }
export function InvestigationManager<T extends RuleTypeParams>({
  setRuleParams,
  value,
}: {
  setRuleParams: (v: { investigation_guide: { blob: string } }) => void;
  value: string;
}) {
  console.log('value from guide', value);
  const [messages, setMessages] = useState<string[]>([]);
  const onParse = useCallback((error: any, { messages: msg, astVal }: any) => {
    setMessages(error ? [error] : [msg]);
  }, []);
  return (
    <div>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText>
            <strong>
              <FormattedMessage
                id="xpack.observability.investigationManager.title"
                defaultMessage="Investigation Guide"
              />
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip content="Include a guide or useful information for addressing alerts created by this rule" />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiMarkdownEditor
        aria-label={i18n.translate('xpack.observability.investigationManager.editor.ariaLabel', {
          defaultMessage: 'Add guidelines for addressing alerts created by this rule',
        })}
        placeholder={i18n.translate('xpack.observability.investigationManager.editor.placeholder', {
          defaultMessage: 'Add guidelines for addressing alerts created by this rule',
        })}
        value={value}
        onChange={(blob) => setRuleParams({ investigation_guide: { blob } })}
        errors={messages}
        height={400}
        onParse={onParse}
        // uiPlugins={[plugin()]}
        initialViewMode="editing"
        // dropHandlers={dropHandlers}
        // isReadonly={false}
      />
    </div>
  );
}

// eslint-disable-next-line import/no-default-export
export default InvestigationManager;
