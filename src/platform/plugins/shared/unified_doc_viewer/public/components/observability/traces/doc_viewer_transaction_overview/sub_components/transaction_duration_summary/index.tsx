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
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Duration } from '@kbn/apm-ui-shared';
import { useRootTransactionContext } from '../../hooks/use_root_transaction';

export interface TransactionDurationSummaryProps {
  duration: number;
}

export function TransactionDurationSummary({ duration }: TransactionDurationSummaryProps) {
  const { transaction, loading } = useRootTransactionContext();

  return (
    <>
      <EuiTitle size="s">
        <h2>
          {i18n.translate(
            'unifiedDocViewer.observability.traces.docViewerTransactionOverview.spanDurationSummary.title',
            {
              defaultMessage: 'Duration',
            }
          )}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText color="subdued" size="xs">
        {i18n.translate(
          'unifiedDocViewer.observability.traces.docViewerTransactionOverview.spanDurationSummary.description',
          {
            defaultMessage: 'Time taken to complete this transaction from start to finish.',
          }
        )}
      </EuiText>
      <EuiSpacer size="m" />

      <>
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxxs">
                  <h3>
                    {i18n.translate(
                      'unifiedDocViewer.observability.traces.docViewerTransactionOverview.spanDurationSummary.duration.title',
                      {
                        defaultMessage: 'Duration',
                      }
                    )}
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={2}>
            <EuiText size="xs">
              <Duration
                duration={duration}
                parent={{ type: 'trace', duration: transaction?.duration, loading }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="xs" />
      </>
    </>
  );
}
