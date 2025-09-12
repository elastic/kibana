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
import { i18n } from '@kbn/i18n';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import { DimensionBadges } from './dimension_badges';
import { categorizeDimensions } from '../../common/utils/dimensions';
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
            <strong>
              {i18n.translate(
                'metricsExperience.overviewTab.strong.opentelemetrySemanticConventionsLabel',
                { defaultMessage: 'OpenTelemetry Semantic Conventions' }
              )}
            </strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiDescriptionList
            type="column"
            compressed
            listItems={[
              {
                title: (
                  <EuiText size="xs">
                    {i18n.translate('metricsExperience.overviewTab.stabilityTextLabel', {
                      defaultMessage: 'Stability',
                    })}
                  </EuiText>
                ),
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
                <strong>
                  {i18n.translate('metricsExperience.overviewTab.strong.dataStreamLabel', {
                    defaultMessage: 'Data stream',
                  })}
                </strong>
              </EuiText>
            ),
            description: <EuiText color="primary">{metric.index}</EuiText>,
          },
          {
            title: (
              <EuiText size="s">
                <strong>
                  {i18n.translate('metricsExperience.overviewTab.strong.fieldTypeLabel', {
                    defaultMessage: 'Field type',
                  })}
                </strong>
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
                      <strong>
                        {i18n.translate('metricsExperience.overviewTab.strong.metricUnitLabel', {
                          defaultMessage: 'Metric unit',
                        })}
                      </strong>
                      <EuiSpacer size="xs" />
                    </EuiText>
                  ),
                  description: <EuiBadge>{metric.unit}</EuiBadge>,
                },
              ]
            : []),
          ...(metric.instrument
            ? [
                {
                  title: (
                    <EuiText size="s">
                      <strong>
                        {i18n.translate('metricsExperience.overviewTab.strong.metricTypeLabel', {
                          defaultMessage: 'Metric type',
                        })}
                      </strong>
                      <EuiSpacer size="xs" />
                    </EuiText>
                  ),
                  description: <EuiBadge>{metric.instrument}</EuiBadge>,
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
                <strong>
                  {i18n.translate('metricsExperience.overviewTab.strong.requiredDimensionsLabel', {
                    defaultMessage: 'Required dimensions',
                  })}
                </strong>
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
                <strong>
                  {i18n.translate(
                    'metricsExperience.overviewTab.strong.additionalDimensionsLabel',
                    { defaultMessage: 'Additional dimensions' }
                  )}
                </strong>
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
