/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiMarkdownEditor } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  setRuleParams: (v: { investigation_guide: { blob: string } }) => void;
  value: string;
}

export function InvestigationGuideEditor({ setRuleParams, value }: Props) {
  return (
    <EuiMarkdownEditor
      aria-label={i18n.translate(
        'responseOpsRuleForm.ruleDetails.investigationGuide.editor.ariaLabel',
        {
          defaultMessage: 'Add guidelines for addressing alerts created by this rule',
        }
      )}
      placeholder={i18n.translate(
        'responseOpsRuleForm.ruleDetails.investigationGuide.editor.placeholder',
        {
          defaultMessage: 'Add guidelines for addressing alerts created by this rule',
        }
      )}
      css={css`
        .euiMarkdownFormat {
          word-wrap: break-word;
        }
      `}
      value={value}
      onChange={(blob) => setRuleParams({ investigation_guide: { blob } })}
      height={200}
      data-test-subj="investigationGuideEditor"
      initialViewMode="editing"
    />
  );
}
