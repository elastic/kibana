/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect, type ReactNode } from 'react';
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

export const AUTOOPS_CALLOUT_DISMISSED_KEY = 'kibana.autoOpsPromotionCallout.dismissed';
export const AUTOOPS_ENABLED_CALLOUT_DISMISSED_KEY = 'kibana.autoOpsEnabledCallout.dismissed';

// ---------------------------------------------------------------------------
// Shared base — owns the panel layout, illustration, and dismiss logic
// ---------------------------------------------------------------------------

interface AutoOpsCalloutBaseProps {
  title: string;
  description: ReactNode;
  ctaButton: ReactNode;
  dismissKey: string;
  dismissAriaLabel: string;
  compressed?: boolean;
  style?: React.CSSProperties;
  'data-test-subj': string;
}

const AutoOpsCalloutBase = ({
  title,
  description,
  ctaButton,
  dismissKey,
  dismissAriaLabel,
  compressed = true,
  style,
  'data-test-subj': dataTestSubj,
}: AutoOpsCalloutBaseProps) => {
  const { euiTheme } = useEuiTheme();
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(dismissKey);
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, [dismissKey]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(dismissKey, 'true');
  };

  if (isDismissed) {
    return null;
  }

  const illustrationSize = `calc(${euiTheme.size.base} * 5)`;

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
      data-test-subj={dataTestSubj}
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
                  <strong>{title}</strong>
                </p>
                <p>{description}</p>
              </EuiText>
            </EuiFlexItem>
            {compressed && <EuiFlexItem grow={false}>{ctaButton}</EuiFlexItem>}
          </EuiFlexGroup>
        </EuiFlexItem>
        {!compressed && <EuiFlexItem grow={false}>{ctaButton}</EuiFlexItem>}
      </EuiFlexGroup>
      <EuiToolTip
        content={dismissAriaLabel}
        position="bottom"
        disableScreenReaderOutput
        anchorProps={{
          style: {
            position: 'absolute',
            top: euiTheme.size.s,
            insetInlineEnd: euiTheme.size.s,
          },
        }}
      >
        <EuiButtonIcon
          iconType="cross"
          onClick={handleDismiss}
          color="text"
          aria-label={dismissAriaLabel}
          data-test-subj={`${dataTestSubj}-dismiss`}
        />
      </EuiToolTip>
    </EuiPanel>
  );
};

// ---------------------------------------------------------------------------
// AutoOpsPromotionCallout — shown when the cluster is not yet connected
// ---------------------------------------------------------------------------

export interface AutoOpsPromotionCalloutProps {
  cloudConnectUrl?: string;
  docsUrl?: string;
  onConnectClick?: (e: React.MouseEvent) => void;
  hasCloudConnectPermission?: boolean;
  /** When true (default), illustration and content+CTA stack in 2 columns. When false, the CTA moves to a third column. */
  compressed?: boolean;
  style?: React.CSSProperties;
}

export const AutoOpsPromotionCallout = ({
  cloudConnectUrl = '/app/cloud_connect',
  docsUrl = CLOUD_CONNECT_DOCS_URL,
  onConnectClick,
  hasCloudConnectPermission,
  compressed = true,
  style,
}: AutoOpsPromotionCalloutProps) => {
  const hasPermission = hasCloudConnectPermission !== false;

  const ctaProps = hasPermission
    ? { href: cloudConnectUrl, onClick: onConnectClick }
    : {
        href: CLOUD_CONNECT_PORTAL_URL,
        target: '_blank' as const,
        rel: 'noopener noreferrer' as const,
      };

  return (
    <AutoOpsCalloutBase
      data-test-subj="autoOpsPromotionCallout"
      dismissKey={AUTOOPS_CALLOUT_DISMISSED_KEY}
      dismissAriaLabel={i18n.translate('management.autoOpsPromotionCallout.dismissAriaLabel', {
        defaultMessage: 'Dismiss AutoOps promotion',
      })}
      title={i18n.translate('management.autoOpsPromotionCallout.title', {
        defaultMessage: 'New! Connect this cluster to AutoOps',
      })}
      description={
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
      }
      ctaButton={
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
      }
      compressed={compressed}
      style={style}
    />
  );
};

// ---------------------------------------------------------------------------
// AutoOpsEnabledCallout — shown once the cluster is connected and AutoOps is active
// ---------------------------------------------------------------------------

export interface AutoOpsEnabledCalloutProps {
  /** The URL to the AutoOps service page for this cluster. If absent, the banner is not rendered. */
  autoOpsUrl?: string;
  /** The URL to the AutoOps documentation, shown as an inline "Learn more" link. */
  docsUrl?: string;
  /** When true (default), illustration and content+CTA stack in 2 columns. When false, the CTA moves to a third column. */
  compressed?: boolean;
  style?: React.CSSProperties;
}

export const AutoOpsEnabledCallout = ({
  autoOpsUrl,
  docsUrl,
  compressed = true,
  style,
}: AutoOpsEnabledCalloutProps) => {
  // No URL means we can't link the user anywhere useful — don't show the banner.
  if (!autoOpsUrl) {
    return null;
  }

  return (
    <AutoOpsCalloutBase
      data-test-subj="autoOpsEnabledCallout"
      dismissKey={AUTOOPS_ENABLED_CALLOUT_DISMISSED_KEY}
      dismissAriaLabel={i18n.translate('management.autoOpsEnabledCallout.dismissAriaLabel', {
        defaultMessage: 'Dismiss AutoOps enabled notification',
      })}
      title={i18n.translate('management.autoOpsEnabledCallout.title', {
        defaultMessage: 'This cluster is connected to AutoOps, our advanced cluster monitoring',
      })}
      description={
        <FormattedMessage
          id="management.autoOpsEnabledCallout.description"
          defaultMessage="Simplify cluster management with real-time issue detection, performance recommendations, and resource utilization insights.{learnMoreLink}"
          values={{
            learnMoreLink: docsUrl ? (
              <>
                {' '}
                <EuiLink
                  href={docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-test-subj="autoOpsEnabledCalloutLearnMoreLink"
                >
                  {i18n.translate('management.autoOpsEnabledCallout.learnMore', {
                    defaultMessage: 'Learn more',
                  })}
                </EuiLink>
              </>
            ) : null,
          }}
        />
      }
      ctaButton={
        <EuiButton
          size="s"
          color="primary"
          href={autoOpsUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-test-subj="autoOpsEnabledCalloutOpenBtn"
        >
          {i18n.translate('management.autoOpsEnabledCallout.openCta', {
            defaultMessage: 'Open AutoOps',
          })}
        </EuiButton>
      }
      compressed={compressed}
      style={style}
    />
  );
};
