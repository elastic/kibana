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
import type { ExemplarPoint } from '../helpers/exemplars';

interface ExemplarFlyoutProps {
  exemplar: ExemplarPoint;
  onClose: () => void;
}

const copyLabel = i18n.translate('expressionXY.exemplarFlyout.copyAriaLabel', {
  defaultMessage: 'Copy to clipboard',
});

const CopyableField = ({ label, value }: { label: string; value: string }) => (
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
                data-test-subj="exemplarFlyoutCopyButton"
              />
            </EuiToolTip>
          )}
        </EuiCopy>
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);

export const ExemplarFlyout: React.FC<ExemplarFlyoutProps> = ({ exemplar, onClose }) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'exemplarFlyoutTitle' });

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      aria-labelledby={flyoutTitleId}
      data-test-subj="exemplarFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>
            {i18n.translate('expressionXY.exemplarFlyout.title', {
              defaultMessage: 'Exemplar',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          <p>
            {i18n.translate('expressionXY.exemplarFlyout.description', {
              defaultMessage:
                'This data point is linked to a trace. Use the identifiers below to inspect it.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="l" />
        <CopyableField
          label={i18n.translate('expressionXY.exemplarFlyout.traceIdLabel', {
            defaultMessage: 'Trace ID',
          })}
          value={exemplar.traceId ?? ''}
        />
        {exemplar.spanId ? (
          <>
            <EuiSpacer size="m" />
            <CopyableField
              label={i18n.translate('expressionXY.exemplarFlyout.spanIdLabel', {
                defaultMessage: 'Span ID',
              })}
              value={exemplar.spanId}
            />
          </>
        ) : null}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
