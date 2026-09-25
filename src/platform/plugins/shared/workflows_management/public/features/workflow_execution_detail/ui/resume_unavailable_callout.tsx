/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonEmpty, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

interface ResumeUnavailableCalloutProps {
  onRetry: () => void;
}

/** Explains why a waiting run offers no resume control when its step input fails to load. */
export const ResumeUnavailableCallout = React.memo<ResumeUnavailableCalloutProps>(({ onRetry }) => (
  <EuiCallOut color="warning" announceOnMount={false} data-test-subj="resumeUnavailableCallout">
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiText size="s">
          <FormattedMessage
            id="workflowsManagement.executionDetail.resumeUnavailable.message"
            defaultMessage="This run is waiting for input, but its details could not be loaded."
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="refresh"
              onClick={onRetry}
              data-test-subj="resumeUnavailableRetryButton"
            >
              <FormattedMessage
                id="workflowsManagement.executionDetail.resumeUnavailable.retry"
                defaultMessage="Retry"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiCallOut>
));

ResumeUnavailableCallout.displayName = 'ResumeUnavailableCallout';
