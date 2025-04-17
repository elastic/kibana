/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiMarkdownEditor,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  setRuleParams: (v: { investigation_guide: { blob: string } }) => void;
  value: string;
}

export function InvestigationGuideEditor({ setRuleParams, value }: Props) {
  return (
    <>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText>
            <strong>
              <FormattedMessage
                id="responseOpsRuleForm.investigationGuide.editor.title"
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
        aria-label={i18n.translate('responseOpsRuleForm.investigationGuide.editor.ariaLabel', {
          defaultMessage: 'Add guidelines for addressing alerts created by this rule',
        })}
        placeholder={i18n.translate('responseOpsRuleForm.investigationGuide.editor.placeholder', {
          defaultMessage: 'Add guidelines for addressing alerts created by this rule',
        })}
        value={value}
        onChange={(blob) => setRuleParams({ investigation_guide: { blob } })}
        height={400}
        data-test-subj="investigationGuideEditor"
        initialViewMode="editing"
      />
    </>
  );
}
