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
import { EuiLink } from '@elastic/eui';
import { KbnInfoCallout, type KbnInfoCalloutProps } from '@kbn/ui-callout';

export interface AutoOpsPromotionCalloutProps {
  cloudConnectUrl?: string;
  onConnectClick?: (e: React.MouseEvent) => void;
  hasCloudConnectPermission?: boolean;
  overrideCalloutProps?: Partial<Omit<KbnInfoCalloutProps, 'children' | 'title' | 'onDismiss'>>;
}

export const AUTOOPS_CALLOUT_DISMISSED_KEY = 'kibana.autoOpsPromotionCallout.dismissed';

export const AutoOpsPromotionCallout = ({
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

  // Determine Cloud Connect link behavior based on cloudConnect permission
  const cloudConnectLinkProps =
    hasCloudConnectPermission === false
      ? {
          href: 'https://cloud.elastic.co/connect-cluster-services-portal',
          target: '_blank' as const,
          rel: 'noopener noreferrer' as const,
          external: true,
        }
      : {
          href: cloudConnectUrl,
          onClick: onConnectClick,
        };

  return (
    <KbnInfoCallout
      title={
        <FormattedMessage
          id="management.autoOpsPromotionCallout.title"
          defaultMessage="New! Connect this cluster to AutoOps"
        />
      }
      data-test-subj="autoOpsPromotionCallout"
      onDismiss={handleDismiss}
      text={
        <p>
          <FormattedMessage
            id="management.autoOpsPromotionCallout.description"
            defaultMessage="Unlock advanced monitoring of ECE, ECK, and self-managed clusters with AutoOps, now available for free across all license types. Set it up today using {cloudConnectLink}."
            values={{
              cloudConnectLink: (
                <EuiLink
                  {...cloudConnectLinkProps}
                  data-test-subj="autoOpsPromotionCalloutCloudConnectLink"
                >
                  <FormattedMessage
                    id="management.autoOpsPromotionCallout.cloudConnectLink"
                    defaultMessage="Cloud Connect"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      }
      {...overrideCalloutProps}
    />
  );
};
