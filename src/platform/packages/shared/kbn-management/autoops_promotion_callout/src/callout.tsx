/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiCallOutProps } from '@elastic/eui';
import { EuiCallOut, EuiButton } from '@elastic/eui';

export type AutoOpsPromotionCalloutProps = EuiCallOutProps;

export const AutoOpsPromotionCallout = ({
  ...overrideCalloutProps
}: AutoOpsPromotionCalloutProps) => {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  if (isDismissed) {
    return null;
  }

  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="management.autoOpsPromotionCallout.title"
          defaultMessage="New! Connect AutoOps to this self-managed cluster"
        />
      }
      color="accent"
      iconType="alert"
      data-test-subj="autoOpsPromotionCallout"
      onDismiss={handleDismiss}
      {...overrideCalloutProps}
    >
      <p>
        <FormattedMessage
          id="management.autoOpsPromotionCallout.description"
          defaultMessage="Connect this cluster to Elastic Cloud to get real-time issue detection, resolution paths, and enable Elastic Support to use AutoOps to assist you better. {learnMoreLink}"
          values={{
            learnMoreLink: (
              <a href="#learn_more_link" target="_blank" rel="noopener noreferrer">
                <FormattedMessage
                  id="management.autoOpsPromotionCallout.learnMore"
                  defaultMessage="Learn more"
                />
              </a>
            ),
          }}
        />
      </p>
      <EuiButton
        color="accent"
        fill
        size="s"
        href="https://cloud.elastic.co/connect-cluster-services-portal"
        target="_blank"
        rel="noopener noreferrer"
      >
        <FormattedMessage
          id="management.autoOpsPromotionCallout.openButton"
          defaultMessage="Connect this cluster"
        />
      </EuiButton>
    </EuiCallOut>
  );
};
