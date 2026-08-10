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

export interface AutoOpsEnabledCalloutProps {
  /** The URL to the AutoOps service page for this cluster. If absent, the banner is not rendered. */
  autoOpsUrl?: string;
  /** The URL to the AutoOps documentation, shown as an inline "Learn more" link. */
  docsUrl?: string;
  /** When true (default), illustration and content+CTA stack in 2 columns. When false, the CTA moves to a third column. */
  compressed?: boolean;
  style?: React.CSSProperties;
}

export const AUTOOPS_ENABLED_CALLOUT_DISMISSED_KEY = 'kibana.autoOpsEnabledCallout.dismissed';

export const AutoOpsEnabledCallout = ({
  autoOpsUrl,
  docsUrl,
  compressed = true,
  style,
}: AutoOpsEnabledCalloutProps) => {
  const { euiTheme } = useEuiTheme();
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(AUTOOPS_ENABLED_CALLOUT_DISMISSED_KEY);
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(AUTOOPS_ENABLED_CALLOUT_DISMISSED_KEY, 'true');
  };

  // No URL means we can't link the user anywhere useful — don't show the banner.
  if (!autoOpsUrl || isDismissed) {
    return null;
  }

  const illustrationSize = `calc(${euiTheme.size.base} * 5)`;

  const ctaButton = (
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
      data-test-subj="autoOpsEnabledCallout"
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
                    {i18n.translate('management.autoOpsEnabledCallout.title', {
                      defaultMessage:
                        'This cluster is connected to AutoOps, our advanced cluster monitoring',
                    })}
                  </strong>
                </p>
                <p>
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
                </p>
              </EuiText>
            </EuiFlexItem>
            {compressed && <EuiFlexItem grow={false}>{ctaButton}</EuiFlexItem>}
          </EuiFlexGroup>
        </EuiFlexItem>
        {!compressed && <EuiFlexItem grow={false}>{ctaButton}</EuiFlexItem>}
      </EuiFlexGroup>
      <EuiToolTip
        content={i18n.translate('management.autoOpsEnabledCallout.dismissAriaLabel', {
          defaultMessage: 'Dismiss AutoOps enabled notification',
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
          aria-label={i18n.translate('management.autoOpsEnabledCallout.dismissAriaLabel', {
            defaultMessage: 'Dismiss AutoOps enabled notification',
          })}
          data-test-subj="autoOpsEnabledCallout-dismiss"
        />
      </EuiToolTip>
    </EuiPanel>
  );
};
