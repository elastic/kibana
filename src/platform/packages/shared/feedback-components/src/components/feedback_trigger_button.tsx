/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { EuiHeaderSectionItemButton, EuiIcon, EuiToolTip, EuiModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FeedbackRegistryEntry } from '@kbn/feedback-registry';

const LazyFeedbackContainer = lazy(() =>
  import('./feedback_container').then((m) => ({ default: m.FeedbackContainer }))
);

interface Props {
  organizationId?: string;
  getQuestions: (appId: string) => FeedbackRegistryEntry[];
  getAppDetails: () => { title: string; id: string; url: string };
  getSolution: () => Promise<string>;
  getCurrentUserEmail: () => Promise<string | undefined>;
  sendFeedback: (data: Record<string, unknown>) => Promise<void>;
  showToast: (title: string, type: 'success' | 'error') => void;
  checkTelemetryOptIn: () => Promise<boolean>;
}

export const FeedbackTriggerButton = ({
  organizationId,
  getQuestions,
  getAppDetails,
  getSolution,
  getCurrentUserEmail,
  sendFeedback,
  showToast,
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
          aria-label={i18n.translate('feedback.modal.ariaLabel', {
            defaultMessage: 'Feedback form',
          })}
        >
          <Suspense fallback={null}>
            <LazyFeedbackContainer
              getAppDetails={getAppDetails}
              getQuestions={getQuestions}
              getSolution={getSolution}
              organizationId={organizationId}
              getCurrentUserEmail={getCurrentUserEmail}
              sendFeedback={sendFeedback}
              showToast={showToast}
              hideFeedbackContainer={handleHideFeedbackContainer}
            />
          </Suspense>
        </EuiModal>
      )}
    </>
  );
};
