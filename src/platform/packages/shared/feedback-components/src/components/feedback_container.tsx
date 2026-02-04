/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { getFeedbackQuestionsForApp } from '@kbn/feedback-registry';
import { getAppDetails } from '@kbn/feedback-plugin/public/src/utils';
import { FeedbackHeader } from './header';
import { FeedbackBody } from './body/feedback_body';
import { FeedbackFooter } from './footer/feedback_footer';

interface Props {
  core: CoreStart;
  cloud?: CloudStart;
  organizationId?: string;
  hideFeedbackContainer: () => void;
}

export const FeedbackContainer = ({
  core,
  cloud,
  organizationId,
  hideFeedbackContainer,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [selectedCsatOptionId, setSelectedCsatOptionId] = useState('');
  const [allowEmailContact, setAllowEmailContact] = useState(true);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(true);

  const solutionView = useObservable(core.chrome.getActiveSolutionNavId$());

  const { title: appTitle, id: appId, url: appUrl } = getAppDetails(core);

  const questions = getFeedbackQuestionsForApp(appId);

  const isFormFilled =
    selectedCsatOptionId ||
    Object.values(questionAnswers).some((answer) => answer.trim().length > 0);

  const isEmailFilled = !allowEmailContact || isEmailValid;

  const isSendFeedbackButtonDisabled = !isFormFilled || !isEmailFilled;

  const handleChangeCsatOptionId = (optionId: string) => {
    setSelectedCsatOptionId(optionId);
  };

  const handleChangeQuestionAnswer = (questionId: string, answer: string) => {
    setQuestionAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleChangeAllowEmailContact = (allow: boolean) => {
    setAllowEmailContact(allow);
  };

  const handleChangeEmail = (emailValue: string) => {
    setEmail(emailValue);
  };

  const handleEmailValidationChange = (isValid: boolean) => {
    setIsEmailValid(isValid);
  };

  const getSolutionType = () => {
    return cloud?.serverless?.projectType || solutionView || 'classic';
  };

  const submitFeedback = async () => {
    try {
      setIsSubmitting(true);

      const eventData = {
        app_id: appId,
        user_email: allowEmailContact && email ? email : undefined,
        allow_email_contact: allowEmailContact,
        solution: getSolutionType(),
        organization_id: organizationId,
        csat_score: Number(selectedCsatOptionId) || undefined,
        questions: questions.map((question) => ({
          id: question.id,
          question: question.question,
          answer: questionAnswers[question.id]?.trim() || 'N/A',
        })),
        url: appUrl,
      };

      await core.http.post(`/internal/feedback/send`, {
        body: JSON.stringify(eventData),
      });

      setIsSubmitting(false);

      core.notifications.toasts.addSuccess({
        title: i18n.translate('feedback.submissionSuccessToast.title', {
          defaultMessage: 'Thanks for your feedback!',
        }),
      });

      hideFeedbackContainer();
    } catch (_error) {
      core.notifications.toasts.addSuccess({
        title: i18n.translate('feedback.submissionFailureToast.title', {
          defaultMessage: 'Failed to submit feedback. Please try again later.',
        }),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerCss = css`
    padding: ${euiTheme.size.l};
    width: 576px;
  `;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      data-test-subj="feedbackContainer"
      css={containerCss}
    >
      <FeedbackHeader />
      <FeedbackBody
        core={core}
        questionAnswers={questionAnswers}
        selectedCsatOptionId={selectedCsatOptionId}
        allowEmailContact={allowEmailContact}
        questions={questions}
        appTitle={appTitle}
        email={email}
        handleChangeCsatOptionId={handleChangeCsatOptionId}
        handleChangeQuestionAnswer={handleChangeQuestionAnswer}
        handleChangeAllowEmailContact={handleChangeAllowEmailContact}
        handleChangeEmail={handleChangeEmail}
        onEmailValidationChange={handleEmailValidationChange}
      />
      <FeedbackFooter
        isSendFeedbackButtonDisabled={isSendFeedbackButtonDisabled}
        submitFeedback={submitFeedback}
        isSubmitting={isSubmitting}
      />
    </EuiFlexGroup>
  );
};
