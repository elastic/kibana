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
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';

interface ResumeUnavailableCalloutProps {
  onRetry: () => void;
}

const retryLabel = i18n.translate('workflowsManagement.executionDetail.resumeUnavailable.retry', {
  defaultMessage: 'Retry',
});

/** Explains why a waiting run offers no resume control when its step input fails to load. */
export const ResumeUnavailableCallout = React.memo<ResumeUnavailableCalloutProps>(({ onRetry }) => (
  <KbnWarningCallout
    announceOnMount={false}
    data-test-subj="resumeUnavailableCallout"
    title={
      <FormattedMessage
        id="workflowsManagement.executionDetail.resumeUnavailable.title"
        defaultMessage="Unable to load the pending action"
      />
    }
    text={
      <FormattedMessage
        id="workflowsManagement.executionDetail.resumeUnavailable.message"
        defaultMessage="This run is waiting for input, but its details could not be loaded."
      />
    }
    actionProps={{
      primary: {
        children: retryLabel,
        onClick: onRetry,
        'data-test-subj': 'resumeUnavailableRetryButton',
      },
    }}
  />
));

ResumeUnavailableCallout.displayName = 'ResumeUnavailableCallout';
