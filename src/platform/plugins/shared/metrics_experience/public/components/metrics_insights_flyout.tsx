/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiTitle,
  EuiBadge,
  EuiDescriptionList,
  EuiIcon,
  EuiCode,
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
} from '@elastic/eui';
import React from 'react';
import type { MetricField } from '../../common/fields/types';
import { categorizeDimensions } from '../utils';
import { DimensionBadges } from './dimension_badges';

interface MetricInsightsFlyoutProps {
  metric: MetricField;
  esqlQuery: string;
  isOpen: boolean;
  onClose: () => void;
}

export const MetricInsightsFlyout = ({
  metric,
  esqlQuery,
  isOpen,
  onClose,
}: MetricInsightsFlyoutProps) => {
  if (!isOpen) return null;

  const { requiredDimensions, optionalDimensions } = categorizeDimensions(
    metric.dimensions || [],
    metric.name
  );

  return (
    <EuiFlyout size="s" onClose={onClose} aria-labelledby="metric-flyout-title">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="sparkles" size="m" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="m">
              <strong>Metric insights</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
          <EuiFlexItem>
            <EuiTitle size="s" id="metric-flyout-title">
              <h2>{metric.name}</h2>
            </EuiTitle>
          </EuiFlexItem>
          {metric.instrument && (
            <EuiFlexItem grow={false}>
              <EuiBadge color={metric.instrument === 'counter' ? 'success' : 'primary'}>
                {metric.instrument.toUpperCase()}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {/* Description */}
        {metric.description && (
          <>
            <EuiText size="s">
              <strong>Description</strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiText size="s">{metric.description}</EuiText>
            <EuiSpacer size="m" />
          </>
        )}

        {/* OpenTelemetry semantic conventions */}
        {metric.source === 'otel' && metric.stability && (
          <>
            <EuiText size="s">
              <strong>OpenTelemetry Semantic Conventions</strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiDescriptionList
              type="column"
              compressed
              listItems={[
                {
                  title: <EuiText size="xs">Stability</EuiText>,
                  description: (
                    <EuiBadge
                      color={
                        metric.stability === 'stable'
                          ? 'success'
                          : metric.stability === 'experimental'
                          ? 'warning'
                          : 'default'
                      }
                      style={{ textTransform: 'capitalize' }}
                    >
                      {metric.stability}
                    </EuiBadge>
                  ),
                },
              ]}
            />
            <EuiSpacer size="m" />
          </>
        )}

        <EuiText size="s">
          <strong>ES|QL Query</strong>
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiCodeBlock language="sql" fontSize="s" paddingSize="s" isCopyable>
          {esqlQuery}
        </EuiCodeBlock>
        <EuiSpacer size="m" />

        <div>
          {/* Technical details */}
          <EuiText size="s">
            <strong>Technical Details</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiDescriptionList
            type="column"
            compressed
            listItems={[
              {
                title: <EuiText size="xs">Data stream</EuiText>,
                description: <EuiCode>{metric.index}</EuiCode>,
              },
              {
                title: <EuiText size="xs">Field type</EuiText>,
                description: <EuiCode>{metric.type}</EuiCode>,
              },
              ...(metric.unit
                ? [
                    {
                      title: <EuiText size="xs">Unit</EuiText>,
                      description: <EuiCode>{metric.unit}</EuiCode>,
                    },
                  ]
                : []),
            ]}
          />

          {/* Dimensions categorized by type */}
          {metric.dimensions && metric.dimensions.length > 0 && (
            <>
              <EuiSpacer size="s" />
              {requiredDimensions.length > 0 && (
                <>
                  <EuiText size="s">
                    <strong>Required dimensions</strong>
                  </EuiText>
                  <EuiSpacer size="xs" />
                  <DimensionBadges
                    dimensions={requiredDimensions}
                    metricName={metric.name}
                    maxDisplay={999}
                  />
                  {optionalDimensions.length > 0 && <EuiSpacer size="s" />}
                </>
              )}
              {optionalDimensions.length > 0 && (
                <>
                  <EuiText size="s">
                    <strong>Additional dimensions</strong>
                  </EuiText>
                  <EuiSpacer size="xs" />
                  <DimensionBadges
                    dimensions={optionalDimensions}
                    metricName={metric.name}
                    maxDisplay={999}
                  />
                </>
              )}
            </>
          )}
        </div>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
