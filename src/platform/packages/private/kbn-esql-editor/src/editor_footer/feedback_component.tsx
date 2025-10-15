/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, useEuiTheme, EuiButtonEmpty, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { FEEDBACK_LINK } from '@kbn/esql-utils';

export function SubmitFeedbackComponent({ isSpaceReduced }: { isSpaceReduced?: boolean }) {
  const { euiTheme } = useEuiTheme();
  const feedbackLabel = i18n.translate('esqlEditor.query.feedback', {
    defaultMessage: 'Feedback',
  });
  return (
    <>
      {isSpaceReduced && (
        <EuiFlexItem grow={false}>
          <EuiToolTip position="top" content={feedbackLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              href={FEEDBACK_LINK}
              iconType="editorComment"
              target="_blank"
              data-test-subj="ESQLEditor-feedback-link"
              aria-label={feedbackLabel}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {!isSpaceReduced && (
        <EuiButtonEmpty
          size="xs"
          color="primary"
          flush="both"
          href={FEEDBACK_LINK}
          target="_blank"
          css={css`
            margin-right: ${euiTheme.size.m};
          `}
          iconType="editorComment"
          data-test-subj="ESQLEditor-feedback-link"
        >
          {i18n.translate('esqlEditor.query.submitFeedback', {
            defaultMessage: 'Submit feedback',
          })}
        </EuiButtonEmpty>
      )}
    </>
  );
}
