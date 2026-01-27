/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiCallOutProps } from '@elastic/eui';
import { EuiCallOut, EuiButton } from '@elastic/eui';

export interface AutoOpsPromotionCalloutProps {
  learnMoreLink: string;
  cloudConnectUrl?: string;
  onConnectClick?: (e: React.MouseEvent) => void;
  hasCloudConnectPermission?: boolean;
  overrideCalloutProps?: Partial<Omit<EuiCallOutProps, 'children' | 'title' | 'onDismiss'>>;
}

export const AUTOOPS_CALLOUT_DISMISSED_KEY = 'kibana.autoOpsPromotionCallout.dismissed';

export const AutoOpsPromotionCallout = ({
  learnMoreLink,
  cloudConnectUrl = '/app/cloud_connect',
  onConnectClick,
  hasCloudConnectPermission,
  overrideCalloutProps = {},
}: AutoOpsPromotionCalloutProps) => {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(AUTOOPS_CALLOUT_DISMISSED_KEY);
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(AUTOOPS_CALLOUT_DISMISSED_KEY, 'true');
  };

  if (isDismissed) {
    return null;
  }

  // Determine button behavior based on cloudConnect permission
  const buttonProps =
    hasCloudConnectPermission === false
      ? {
          href: 'https://cloud.elastic.co/connect-cluster-services-portal',
          target: '_blank' as const,
          rel: 'noopener noreferrer',
        }
      : {
          href: cloudConnectUrl,
          onClick: onConnectClick,
        };

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
          defaultMessage="Connect this cluster to AutoOps on Elastic Cloud for simplified monitoring, real-time issue detection, and performance recommendations. {learnMoreLink}"
          values={{
            learnMoreLink: (
              <a href={learnMoreLink} target="_blank" rel="noopener noreferrer">
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
        {...buttonProps}
        data-test-subj="autoOpsPromotionCalloutConnectButton"
      >
        <FormattedMessage
          id="management.autoOpsPromotionCallout.openButton"
          defaultMessage="Connect this cluster"
        />
      </EuiButton>
    </EuiCallOut>
  );
};
