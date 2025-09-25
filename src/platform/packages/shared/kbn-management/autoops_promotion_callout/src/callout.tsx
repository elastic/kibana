/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiCallOutProps } from '@elastic/eui';
import { EuiCallOut, EuiButton } from '@elastic/eui';

export interface AutoOpsPromotionCalloutProps extends EuiCallOutProps {
  cloudBaseUrl?: string;
  docsLink?: string;
}

export const AutoOpsPromotionCallout = ({
  cloudBaseUrl,
  docsLink,
  ...overrideCalloutProps
}: AutoOpsPromotionCalloutProps) => {
  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="management.autoOpsPromotionCallout.title"
          defaultMessage="This cluster is connected to AutoOps, our advanced cluster monitoring"
        />
      }
      color="accent"
      iconType="alert"
      data-test-subj="autoOpsPromotionCallout"
      {...overrideCalloutProps}
    >
      <p>
        <FormattedMessage
          id="management.autoOpsPromotionCallout.description"
          defaultMessage="Simplify cluster management with insights tailored to your Elasticsearch operations and configuration. {learnMoreLink}"
          values={{
            learnMoreLink: docsLink && (
              <a href={docsLink} target="_blank" rel="noopener noreferrer">
                <FormattedMessage
                  id="management.autoOpsPromotionCallout.learnMore"
                  defaultMessage="Learn more"
                />
              </a>
            ),
          }}
        />
      </p>
      {cloudBaseUrl && (
        <EuiButton
          color="accent"
          fill
          size="s"
          href={`${cloudBaseUrl || ''}/connect-cluster-services-portal`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FormattedMessage
            id="management.autoOpsPromotionCallout.openButton"
            defaultMessage="Open AutoOps"
          />
        </EuiButton>
      )}
    </EuiCallOut>
  );
};
