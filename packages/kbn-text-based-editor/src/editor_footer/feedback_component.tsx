/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiIcon, useEuiTheme, EuiLink, EuiToolTip } from '@elastic/eui';
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
            data-test-subj="TextBasedLangEditor-feedback-link"
          >
            <EuiToolTip
              position="top"
              content={i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.feedback', {
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
        <>
          <EuiFlexItem grow={false}>
            <EuiIcon type="editorComment" color="primary" size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink
              href={FEEDBACK_LINK}
              external={false}
              target="_blank"
              css={css`
                font-size: 12px;
                margin-right: ${euiTheme.size.m};
              `}
              data-test-subj="TextBasedLangEditor-feedback-link"
            >
              {i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.submitFeedback', {
                defaultMessage: 'Submit feedback',
              })}
            </EuiLink>
          </EuiFlexItem>
        </>
      )}
    </>
  );
}
