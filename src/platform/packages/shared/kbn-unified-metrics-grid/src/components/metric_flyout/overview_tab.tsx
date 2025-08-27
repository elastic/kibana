/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiText, EuiSpacer, EuiDescriptionList } from '@elastic/eui';
import React from 'react';
import { DimensionBadges } from './dimension_badges';
import type { MetricField } from '../../types';
import { categorizeDimensions } from '../../utils';
import { TabTitleAndDescription } from './tab_title_and_description';

interface OverviewTabProps {
  metric: MetricField;
}

export const OverviewTab = ({ metric }: OverviewTabProps) => {
  const { requiredDimensions, optionalDimensions } = categorizeDimensions(
    metric.dimensions || [],
    metric.name
  );
  return (
    <>
      <TabTitleAndDescription metric={metric} />
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

      <EuiDescriptionList
        compressed
        rowGutterSize="m"
        listItems={[
          {
            title: (
              <EuiText size="s">
                <strong>Data stream</strong>
              </EuiText>
            ),
            description: <EuiText color="primary">{metric.index}</EuiText>,
          },
          {
            title: (
              <EuiText size="s">
                <strong>Field type</strong>
                <EuiSpacer size="xs" />
              </EuiText>
            ),
            description: <EuiBadge>{metric.type}</EuiBadge>,
          },
          ...(metric.unit
            ? [
                {
                  title: (
                    <EuiText size="s">
                      <strong>Metric unit</strong>
                      <EuiSpacer size="xs" />
                    </EuiText>
                  ),
                  description: <EuiBadge>{metric.unit}</EuiBadge>,
                },
              ]
            : []),
          ...(metric.timeSeriesMetric
            ? [
                {
                  title: (
                    <EuiText size="s">
                      <strong>Metric type</strong>
                      <EuiSpacer size="xs" />
                    </EuiText>
                  ),
                  description: <EuiBadge>{metric.timeSeriesMetric}</EuiBadge>,
                },
              ]
            : []),
        ]}
      />

      {/* Dimensions categorized by type */}
      {metric.dimensions && metric.dimensions.length > 0 && (
        <>
          <EuiSpacer size="m" />
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
              {optionalDimensions.length > 0 && <EuiSpacer size="m" />}
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
    </>
  );
};
