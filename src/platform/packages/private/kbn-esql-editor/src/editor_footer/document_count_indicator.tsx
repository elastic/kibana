/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiText, EuiIcon, EuiToolTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useEsqlDocumentCount } from '../hooks/use_esql_document_count';

interface DocumentCountIndicatorProps {
  esqlQuery: string;
}

export function DocumentCountIndicator({ esqlQuery }: DocumentCountIndicatorProps) {
  const { count, loading, error, estimatedDuration } = useEsqlDocumentCount(esqlQuery);

  // Don't show anything if there's no query or if we're not loading and have no count
  if (!esqlQuery.trim() || (!loading && count === null && !error)) {
    return null;
  }

  if (loading) {
    return (
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate('esqlEditor.documentCount.calculatingTooltip', {
            defaultMessage: 'Calculating document count...',
          })}
        >
          <EuiText size="xs" color="subdued" data-test-subj="ESQLEditor-document-count">
            <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="loading" size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {i18n.translate('esqlEditor.documentCount.calculating', {
                  defaultMessage: 'Calculating...',
                })}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiText>
        </EuiToolTip>
      </EuiFlexItem>
    );
  }

  if (error) {
    // Show greyed-out document count instead of error message
    return (
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate('esqlEditor.documentCount.errorTooltip', {
            defaultMessage: 'Unable to calculate document count: {error}',
            values: { error },
          })}
        >
          <EuiText size="xs" color="subdued" data-test-subj="ESQLEditor-document-count">
            <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="documents" size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {i18n.translate('esqlEditor.documentCount.unknown', {
                  defaultMessage: '~? docs',
                })}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiText>
        </EuiToolTip>
      </EuiFlexItem>
    );
  }

  if (count !== null) {
    // Determine traffic light color based on estimated duration
    let trafficLightColor = 'success'; // Green
    let trafficLightIcon = 'check';
    
    if (estimatedDuration !== null) {
      if (estimatedDuration > 10) {
        trafficLightColor = 'danger'; // Red
        trafficLightIcon = 'alert';
      } else if (estimatedDuration > 3) {
        trafficLightColor = 'warning'; // Yellow
        trafficLightIcon = 'clock';
      }
    }

    const tooltipContent = estimatedDuration !== null
      ? i18n.translate('esqlEditor.documentCount.durationTooltip', {
          defaultMessage: '{duration}s to run',
          values: { 
            duration: estimatedDuration.toFixed(1),
          },
        })
      : i18n.translate('esqlEditor.documentCount.tooltip', {
          defaultMessage: 'Approx. {count} docs will be queried',
        });

    return (
      <EuiFlexItem grow={false}>
        <EuiToolTip content={tooltipContent}>
          <EuiText size="xs" color="subdued" data-test-subj="ESQLEditor-document-count">
            <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="documents" size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {i18n.translate('esqlEditor.documentCount.count', {
                  defaultMessage: '~{count} docs',
                  values: { count: count.toLocaleString() },
                })}
              </EuiFlexItem>
              {estimatedDuration !== null && (
                <EuiFlexItem grow={false}>
                  <EuiIcon 
                    type={trafficLightIcon} 
                    size="s" 
                    color={trafficLightColor}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiText>
        </EuiToolTip>
      </EuiFlexItem>
    );
  }

  return null;
}
