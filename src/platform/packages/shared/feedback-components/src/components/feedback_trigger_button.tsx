/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import type { Observable } from 'rxjs';
import { EuiHeaderSectionItemButton, EuiIcon, EuiToolTip, EuiModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FeedbackRegistryEntry } from '@kbn/feedback-registry';

const LazyFeedbackContainer = lazy(() =>
  import('./feedback_container').then((m) => ({ default: m.FeedbackContainer }))
);

interface AppDetails {
  title: string;
  id: string;
  url: string;
}

interface Props {
  appDetails: AppDetails;
  questions: FeedbackRegistryEntry[];
  activeSolutionNavId$: Observable<string | null>;
  serverlessProjectType?: string;
  organizationId?: string;
  getCurrentUserEmail: () => Promise<string | undefined>;
  sendFeedback: (data: Record<string, unknown>) => Promise<void>;
  showSuccessToast: (title: string) => void;
  showErrorToast: (title: string) => void;
  checkTelemetryOptIn: () => Promise<boolean>;
}

export const FeedbackTriggerButton = ({
  appDetails,
  questions,
  activeSolutionNavId$,
  serverlessProjectType,
  organizationId,
  getCurrentUserEmail,
  sendFeedback,
  showSuccessToast,
  showErrorToast,
  checkTelemetryOptIn,
}: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isOptedIn, setIsOptedIn] = useState<boolean | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        setIsLoading(true);
        const optedIn = await checkTelemetryOptIn();
        setIsOptedIn(optedIn);
      } catch {
        setIsOptedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [checkTelemetryOptIn]);

  const handleShowFeedbackContainer = () => {
    setIsModalOpen(true);
  };

  const handleHideFeedbackContainer = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <EuiToolTip
        content={
          !isOptedIn &&
          i18n.translate('feedback.triggerButton.tooltip', {
            defaultMessage: 'Enable usage collection to submit feedback',
          })
        }
      >
        <EuiHeaderSectionItemButton
          data-test-subj="feedbackTriggerButton"
          aria-haspopup="dialog"
          aria-label={i18n.translate('feedback.triggerButton.ariaLabel', {
            defaultMessage: 'Submit feedback',
          })}
          onClick={handleShowFeedbackContainer}
          isLoading={isLoading}
          disabled={!isOptedIn}
        >
          <EuiIcon type="comment" size="m" />
        </EuiHeaderSectionItemButton>
      </EuiToolTip>
      {isModalOpen && (
        <EuiModal
          onClose={handleHideFeedbackContainer}
          outsideClickCloses={true}
          aria-label={i18n.translate('feedback.modal.ariaLabel', {
            defaultMessage: 'Feedback form',
          })}
        >
          <Suspense fallback={null}>
            <LazyFeedbackContainer
              appDetails={appDetails}
              questions={questions}
              activeSolutionNavId$={activeSolutionNavId$}
              serverlessProjectType={serverlessProjectType}
              organizationId={organizationId}
              getCurrentUserEmail={getCurrentUserEmail}
              sendFeedback={sendFeedback}
              showSuccessToast={showSuccessToast}
              showErrorToast={showErrorToast}
              hideFeedbackContainer={handleHideFeedbackContainer}
            />
          </Suspense>
        </EuiModal>
      )}
    </>
  );
};
