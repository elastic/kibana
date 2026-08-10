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
import { i18n } from '@kbn/i18n';
import {
  EuiIllustration,
  EuiLink,
  EuiButton,
  EuiButtonIcon,
  EuiText,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { megaphone } from '@elastic/eui-illustrations';

const CLOUD_CONNECT_DOCS_URL = 'https://www.elastic.co/docs/deploy-manage/cloud-connect';
const CLOUD_CONNECT_PORTAL_URL = 'https://cloud.elastic.co/connect-cluster-services-portal';

export interface AutoOpsPromotionCalloutProps {
  cloudConnectUrl?: string;
  docsUrl?: string;
  onConnectClick?: (e: React.MouseEvent) => void;
  hasCloudConnectPermission?: boolean;
  /** When true (default), illustration and content+CTA stack in 2 columns. When false, the CTA moves to a third column. */
  compressed?: boolean;
  style?: React.CSSProperties;
}

export const AUTOOPS_CALLOUT_DISMISSED_KEY = 'kibana.autoOpsPromotionCallout.dismissed';

export const AutoOpsPromotionCallout = ({
  cloudConnectUrl = '/app/cloud_connect',
  docsUrl = CLOUD_CONNECT_DOCS_URL,
  onConnectClick,
  hasCloudConnectPermission,
  compressed = true,
  style,
}: AutoOpsPromotionCalloutProps) => {
  const { euiTheme } = useEuiTheme();
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

  const hasPermission = hasCloudConnectPermission !== false;

  const ctaProps = hasPermission
    ? { href: cloudConnectUrl, onClick: onConnectClick }
    : {
        href: CLOUD_CONNECT_PORTAL_URL,
        target: '_blank' as const,
        rel: 'noopener noreferrer' as const,
      };

  const illustrationSize = `calc(${euiTheme.size.base} * 5)`;

  const ctaButton = (
    <EuiButton
      size="s"
      color="primary"
      data-test-subj="autoOpsPromotionCalloutConnectBtn"
      {...ctaProps}
    >
      {i18n.translate('management.autoOpsPromotionCallout.connectCta', {
        defaultMessage: 'Get Started',
      })}
    </EuiButton>
  );

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      style={{
        position: 'relative',
        paddingInlineEnd: `calc(${euiTheme.size.s} * 5)`,
        backgroundColor: euiTheme.colors.backgroundBaseHighlighted,
        ...style,
      }}
      data-test-subj="autoOpsPromotionCallout"
    >
      <EuiFlexGroup
        gutterSize="m"
        alignItems={compressed ? 'flexStart' : 'center'}
        responsive={false}
      >
        <EuiFlexItem grow={false} style={{ width: illustrationSize, height: illustrationSize }}>
          <EuiIllustration type={megaphone} alt="" />
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 0 }}>
          <EuiFlexGroup direction="column" gutterSize="m" alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <p style={{ marginBottom: euiTheme.size.xs }}>
                  <strong>
                    {i18n.translate('management.autoOpsPromotionCallout.title', {
                      defaultMessage: 'New! Connect this cluster to AutoOps',
                    })}
                  </strong>
                </p>
                <p>
                  <FormattedMessage
                    id="management.autoOpsPromotionCallout.description"
                    defaultMessage="Unlock advanced monitoring of ECE, ECK, and self-managed clusters with AutoOps, now available for free across all license types. Set it up today using {cloudConnectLink}."
                    values={{
                      cloudConnectLink: (
                        <EuiLink
                          href={docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-test-subj="autoOpsPromotionCalloutDocsLink"
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
              </EuiText>
            </EuiFlexItem>
            {compressed && <EuiFlexItem grow={false}>{ctaButton}</EuiFlexItem>}
          </EuiFlexGroup>
        </EuiFlexItem>
        {!compressed && <EuiFlexItem grow={false}>{ctaButton}</EuiFlexItem>}
      </EuiFlexGroup>
      <EuiToolTip
        content={i18n.translate('management.autoOpsPromotionCallout.dismissAriaLabel', {
          defaultMessage: 'Dismiss AutoOps promotion',
        })}
        disableScreenReaderOutput
      >
        <EuiButtonIcon
          iconType="cross"
          onClick={handleDismiss}
          style={{
            position: 'absolute',
            top: euiTheme.size.s,
            insetInlineEnd: euiTheme.size.s,
          }}
          color="text"
          aria-label={i18n.translate('management.autoOpsPromotionCallout.dismissAriaLabel', {
            defaultMessage: 'Dismiss AutoOps promotion',
          })}
          data-test-subj="autoOpsPromotionCallout-dismiss"
        />
      </EuiToolTip>
    </EuiPanel>
  );
};
