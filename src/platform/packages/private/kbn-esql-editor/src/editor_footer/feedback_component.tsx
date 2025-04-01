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
import { EuiFlexItem, EuiIcon, useEuiTheme, EuiLink, EuiToolTip, EuiFlexGroup } from '@elastic/eui';
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
            <EuiToolTip
              position="top"
              content={i18n.translate('esqlEditor.query.feedback', {
                defaultMessage: 'Feedback',
              })}
            >
              <EuiIcon
                type="editorComment"
                color="primary"
                size="m"
                css={css`
                  margin-right: ${euiTheme.size.s};
                `}
              />
            </EuiToolTip>
          </EuiLink>
        </EuiFlexItem>
      )}
      {!isSpaceReduced && (
        <EuiLink
          href={FEEDBACK_LINK}
          external={false}
          target="_blank"
          css={css`
            font-size: 12px;
            margin-right: ${euiTheme.size.m};
          `}
          data-test-subj="ESQLEditor-feedback-link"
        >
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="editorComment" color="primary" size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {i18n.translate('esqlEditor.query.submitFeedback', {
                defaultMessage: 'Submit feedback',
              })}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiLink>
      )}
    </>
  );
}
