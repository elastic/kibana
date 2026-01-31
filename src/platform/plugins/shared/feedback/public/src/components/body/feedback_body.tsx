/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ChangeEvent } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { EuiFlexGroup, EuiFlexItem, EuiForm, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { FeedbackTextArea } from './feedback_text_area';
import { EmailSection } from './email';
import { SessionInfoDisclaimer } from './session_info_disclaimer';
import { CsatButtons } from './csat_buttons';

interface Props {
  core: CoreStart;
  selectedCsatOptionId: string;
  experienceFeedbackText: string;
  generalFeedbackText: string;
  allowEmailContact: boolean;
  email: string;
  handleChangeCsatOptionId: (optionId: string) => void;
  handleChangeExperienceFeedbackText: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleChangeGeneralFeedbackText: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleChangeAllowEmailContact: (e: ChangeEvent<HTMLInputElement>) => void;
  handleChangeEmail: (e: ChangeEvent<HTMLInputElement>) => void;
}
export const FeedbackBody = ({
  core,
  selectedCsatOptionId,
  experienceFeedbackText,
  generalFeedbackText,
  allowEmailContact,
  email,
  handleChangeCsatOptionId,
  handleChangeExperienceFeedbackText,
  handleChangeGeneralFeedbackText,
  handleChangeAllowEmailContact,
  handleChangeEmail,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  const bodyCss = css`
    padding-top: ${euiTheme.size.m};
    width: 600px;
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem css={bodyCss} data-test-subj="feedbackBody">
        <EuiForm component="form">
          <CsatButtons
            core={core}
            selectedCsatOptionId={selectedCsatOptionId}
            handleChangeCsatOptionId={handleChangeCsatOptionId}
          />
          <EuiSpacer size="m" />
          {/* TODO: Both forms are replaced with custom questions if present */}
          <FeedbackTextArea
            value={experienceFeedbackText}
            aria-label={i18n.translate('feedback.body.experienceFeedbackTextArea.ariaLabel', {
              defaultMessage: 'Describe your experience',
            })}
            handleChangeValue={handleChangeExperienceFeedbackText}
            placeholder={i18n.translate('feedback.body.experienceFeedbackTextArea.placeholder', {
              defaultMessage: 'Describe your experience',
            })}
            testId="feedbackExperienceTextArea"
          />
          <EuiSpacer size="l" />
          <FeedbackTextArea
            label={i18n.translate('feedback.body.additionalFeedback.label', {
              defaultMessage: 'Anything else you would like to share about Elastic overall?',
            })}
            value={generalFeedbackText}
            handleChangeValue={handleChangeGeneralFeedbackText}
            ariaLabel={i18n.translate('feedback.body.additionalFeedback.ariaLabel', {
              defaultMessage: 'Additional feedback about Elastic',
            })}
          />
          <EmailSection
            allowEmailContact={allowEmailContact}
            email={email}
            handleChangeAllowEmailContact={handleChangeAllowEmailContact}
            handleChangeEmail={handleChangeEmail}
          />
        </EuiForm>
      </EuiFlexItem>
      <EuiFlexItem>
        <SessionInfoDisclaimer />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
