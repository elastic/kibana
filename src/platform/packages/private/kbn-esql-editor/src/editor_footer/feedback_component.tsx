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
import { EuiFlexItem, EuiIconTip, useEuiTheme, EuiLink, EuiButtonEmpty } from '@elastic/eui';
import { css } from '@emotion/react';
import { FEEDBACK_LINK } from '@kbn/esql-utils';

export function SubmitFeedbackComponent({ isSpaceReduced }: { isSpaceReduced?: boolean }) {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      {isSpaceReduced && (
        <EuiFlexItem grow={false}>
          <EuiLink
            href={FEEDBACK_LINK}
            external={false}
            target="_blank"
            data-test-subj="ESQLEditor-feedback-link"
          >
            <EuiIconTip
              type="editorComment"
              color="primary"
              size="m"
              css={css`
                margin-right: ${euiTheme.size.s};
              `}
              content={i18n.translate('esqlEditor.query.feedback', {
                defaultMessage: 'Feedback',
              })}
              position="top"
            />
          </EuiLink>
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
