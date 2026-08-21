/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiCode,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { XYBubbleDetail } from '@kbn/lens-common';

interface BubbleDetailsFlyoutProps {
  details: XYBubbleDetail[];
  onClose: () => void;
  /** When provided, shows a button that opens the related trace in Discover. */
  onOpenInDiscover?: () => void;
}

const copyLabel = i18n.translate('unifiedChartSectionViewer.bubbleDetailsFlyout.copyAriaLabel', {
  defaultMessage: 'Copy to clipboard',
});

const CopyableField = ({ label, value }: XYBubbleDetail) => (
  <>
    <EuiText size="xs" color="subdued">
      <strong>{label}</strong>
    </EuiText>
    <EuiSpacer size="xs" />
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem>
        <EuiCode>{value}</EuiCode>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiCopy textToCopy={value}>
          {(copy) => (
            <EuiToolTip content={copyLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="copy"
                onClick={copy}
                aria-label={copyLabel}
                data-test-subj="bubbleDetailsFlyoutCopyButton"
              />
            </EuiToolTip>
          )}
        </EuiCopy>
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);

/**
 * Consumer-owned flyout that shows a clicked exemplar's metadata and, when it is
 * linked to a trace, a button to open that trace in Discover. Rendering it here
 * keeps the chart/Lens layer generic.
 */
export const BubbleDetailsFlyout: React.FC<BubbleDetailsFlyoutProps> = ({
  details,
  onClose,
  onOpenInDiscover,
}) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'bubbleDetailsFlyoutTitle' });

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      aria-labelledby={flyoutTitleId}
      data-test-subj="bubbleDetailsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>
            {i18n.translate('unifiedChartSectionViewer.bubbleDetailsFlyout.title', {
              defaultMessage: 'Exemplar',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('unifiedChartSectionViewer.bubbleDetailsFlyout.description', {
              defaultMessage:
                'An exemplar links this metric data point to the trace that produced it. Use the metadata below to inspect it, or open the related trace in Discover.',
            })}
          </p>
        </EuiText>
        {onOpenInDiscover ? (
          <>
            <EuiSpacer size="m" />
            <EuiButton
              iconType="discoverApp"
              onClick={onOpenInDiscover}
              fill
              size="s"
              data-test-subj="bubbleDetailsFlyoutOpenInDiscover"
            >
              {i18n.translate('unifiedChartSectionViewer.bubbleDetailsFlyout.openInDiscover', {
                defaultMessage: 'Open trace in Discover',
              })}
            </EuiButton>
          </>
        ) : null}
        <EuiSpacer size="l" />
        {details.map((detail, index) => (
          <React.Fragment key={`${detail.field ?? detail.label}-${index}`}>
            {index > 0 ? <EuiSpacer size="m" /> : null}
            <CopyableField label={detail.label} value={detail.value} />
          </React.Fragment>
        ))}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
