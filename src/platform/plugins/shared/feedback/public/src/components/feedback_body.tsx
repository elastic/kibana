/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, type ChangeEvent } from 'react';
import {
  EuiCheckbox,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTextArea,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import { FormLabel } from './form_label';
import { CsatButtons } from './csat_buttons';

interface Props {
  core: CoreStart;
  feedbackText: string;
  handleChangeFeedbackText: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}
export const FeedbackBody = ({ core, feedbackText, handleChangeFeedbackText }: Props) => {
  const [allowEmailContact, setAllowEmailContact] = useState(false);
  const [generalFeedbackText, setGeneralFeedbackText] = useState('');
  const { euiTheme } = useEuiTheme();

  const handleChangeAllowEmailContact = (e: ChangeEvent<HTMLInputElement>) => {
    setAllowEmailContact(e.target.checked);
  };

  const bodyCss = css`
    padding-top: ${euiTheme.size.m};
  `;

  const formCss = css`
    width: 600px;
  `;

  return (
    <EuiFlexItem css={bodyCss} data-test-subj="feedbackFormBody">
      <EuiForm component="form" css={formCss}>
        <CsatButtons core={core} />
        <EuiSpacer size="m" />
        <EuiFormRow fullWidth>
          <EuiTextArea
            fullWidth
            rows={4}
            data-test-subj="feedbackFormTextArea"
            value={feedbackText}
            aria-label={i18n.translate('feedback.form.body.experienceFeedbackTextArea.ariaLabel', {
              defaultMessage: 'Describe your experience',
            })}
            onChange={handleChangeFeedbackText}
            placeholder={i18n.translate(
              'feedback.form.body.experienceFeedbackTextArea.placeholder',
              {
                defaultMessage: 'Describe your experience',
              }
            )}
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={
            <FormLabel>
              <FormattedMessage
                id="feedback.form.body.additionalFeedback.label"
                defaultMessage="Anything else you would like to share about Elastic overall?"
              />
            </FormLabel>
          }
        >
          <EuiTextArea
            fullWidth
            rows={4}
            data-test-subj="feedbackFormAdditionalFeedbackTextArea"
            value={generalFeedbackText}
            aria-label={i18n.translate('feedback.form.body.additionalFeedback.ariaLabel', {
              defaultMessage: 'Additional feedback about Elastic',
            })}
            onChange={(e) => setGeneralFeedbackText(e.target.value)}
          />
        </EuiFormRow>
        <EuiFormRow>
          <EuiCheckbox
            id="feedbackFormCheckbox"
            label={i18n.translate('feedback.form.body.checkbox.consentLabel', {
              defaultMessage: "I'm open to being contacted via email.",
            })}
            checked={allowEmailContact}
            onChange={handleChangeAllowEmailContact}
          />
        </EuiFormRow>
      </EuiForm>
    </EuiFlexItem>
  );
};
