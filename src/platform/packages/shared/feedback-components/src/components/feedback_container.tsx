/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { Observable } from 'rxjs';
import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import type { FeedbackRegistryEntry } from '@kbn/feedback-registry';
import { FeedbackHeader } from './header';
import { FeedbackBody } from './body/feedback_body';
import { FeedbackFooter } from './footer/feedback_footer';

interface AppDetails {
  title: string;
  id: string;
  url: string;
}

interface Props {
  /** App details (title, id, url) */
  appDetails: AppDetails;
  /** Feedback questions for this app */
  questions: FeedbackRegistryEntry[];
  /** Observable for active solution nav ID */
  activeSolutionNavId$: Observable<string | null>;
  /** Serverless project type if in serverless mode */
  serverlessProjectType?: string;
  /** Organization ID */
  organizationId?: string;
  /** Function to fetch current user's email */
  getCurrentUserEmail: () => Promise<string | undefined>;
  /** Function to send feedback to the server */
  sendFeedback: (data: Record<string, unknown>) => Promise<void>;
  /** Function to show a success toast */
  showSuccessToast: (title: string) => void;
  /** Function to show an error toast */
  showErrorToast: (title: string) => void;
  /** Callback to hide the feedback container */
  hideFeedbackContainer: () => void;
}

export const FeedbackContainer = ({
  appDetails,
  questions,
  activeSolutionNavId$,
  serverlessProjectType,
  organizationId,
  getCurrentUserEmail,
  sendFeedback,
  showSuccessToast,
  showErrorToast,
  hideFeedbackContainer,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [selectedCsatOptionId, setSelectedCsatOptionId] = useState('');
  const [allowEmailContact, setAllowEmailContact] = useState(true);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(true);

  const solutionView = useObservable(activeSolutionNavId$);

  const { title: appTitle, id: appId, url: appUrl } = appDetails;

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
    return serverlessProjectType || solutionView || 'classic';
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

      await sendFeedback(eventData);

      setIsSubmitting(false);

      showSuccessToast(
        i18n.translate('feedback.submissionSuccessToast.title', {
          defaultMessage: 'Thanks for your feedback!',
        })
      );

      hideFeedbackContainer();
    } catch (_error) {
      showErrorToast(
        i18n.translate('feedback.submissionFailureToast.title', {
          defaultMessage: 'Failed to submit feedback. Please try again later.',
        })
      );
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
        getCurrentUserEmail={getCurrentUserEmail}
      />
      <FeedbackFooter
        isSendFeedbackButtonDisabled={isSendFeedbackButtonDisabled}
        submitFeedback={submitFeedback}
        isSubmitting={isSubmitting}
      />
    </EuiFlexGroup>
  );
};
