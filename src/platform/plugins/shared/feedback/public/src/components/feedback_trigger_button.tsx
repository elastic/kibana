/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { EuiHeaderSectionItemButton, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AnalyticsServiceStart } from '@kbn/core/public';
import { canSendTelemetry } from '../utils';

interface Props {
  analytics: AnalyticsServiceStart;
  handleShowFeedbackContainer: () => void;
}

export const FeedbackTriggerButton = ({ analytics, handleShowFeedbackContainer }: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [enabledFeedbackButton, setEnabledFeedbackButton] = useState(false);

  useEffect(() => {
    setIsLoading(true);

    canSendTelemetry(analytics)
      .then((canSend) => {
        if (canSend) {
          setEnabledFeedbackButton(true);
        }
      })
      .catch(() => {
        setEnabledFeedbackButton(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [analytics]);

  return (
    <EuiHeaderSectionItemButton
      data-test-subj="feedbackButton"
      aria-haspopup="dialog"
      aria-label={i18n.translate('feedback.button.ariaLabel', {
        defaultMessage: 'Give feedback',
      })}
      onClick={handleShowFeedbackContainer}
      isLoading={isLoading}
      disabled={!enabledFeedbackButton}
    >
      <EuiIcon type="comment" size="m" />
    </EuiHeaderSectionItemButton>
  );
};
