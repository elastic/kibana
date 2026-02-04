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
import type { CoreStart } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';

const LazyFeedbackContainer = lazy(() =>
  import('./feedback_container').then((m) => ({ default: m.FeedbackContainer }))
);

interface Props {
  core: CoreStart;
  cloud?: CloudStart;
  organizationId?: string;
}

export const FeedbackTriggerButton = ({ core, cloud, organizationId }: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isOptedIn, setIsOptedIn] = useState<boolean | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const checkTelemetryStatus = async () => {
      try {
        setIsLoading(true);
        const telemetryConfig = await core.http.get<{ optIn: boolean | null }>(
          '/internal/telemetry/config',
          { version: '2' }
        );
        setIsOptedIn(telemetryConfig.optIn);
      } catch (err) {
        setIsOptedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkTelemetryStatus();
  }, [core.http]);

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
              core={core}
              cloud={cloud}
              organizationId={organizationId}
              hideFeedbackContainer={handleHideFeedbackContainer}
            />
          </Suspense>
        </EuiModal>
      )}
    </>
  );
};
