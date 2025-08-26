/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonIcon,
  EuiToolTip,
  EuiTextTruncate,
} from '@elastic/eui';
import React, { useState } from 'react';
import type { MetricField } from '../../../common/fields/types';
import { MetricInsightsFlyout } from '../metrics_insights_flyout';

interface ChartHeaderProps {
  title: string;
  byDimension?: string;
  esqlQuery: string;
  metric: MetricField;
  displayDensity?: 'normal' | 'compact' | 'row';
}

export const ChartHeader = ({
  title,
  byDimension,
  esqlQuery,
  metric,
  displayDensity = 'normal',
}: ChartHeaderProps) => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  // Get title sizes based on display density
  const getTitleSize = () => {
    if (displayDensity === 'compact') {
      return 'xxs';
    }
    return 'xs';
  };

  const getSubtitleSize = () => {
    if (displayDensity === 'compact') {
      return 'xxs';
    }
    return 'xs';
  };

  const getDescriptionSize = () => {
    if (displayDensity === 'compact') {
      return 'xs';
    }
    return 's';
  };

  const handleExplore = () => {
    // const queryParam = encodeURIComponent(esqlQuery);
    // TODO: Replace with code to open ESQL in Discover
    window.alert('Open ESQL in Discover');
  };

  const handleInsights = () => {
    setIsFlyoutOpen(!isFlyoutOpen);
  };

  const actionIcons = (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiToolTip content="Explore">
          <EuiButtonIcon
            iconType="inspect"
            size="s"
            color="text"
            aria-label="Explore this metric"
            onClick={handleExplore}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content="Metric insights" disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="sparkles"
            size="s"
            color="text"
            aria-label="Metric insights"
            onClick={handleInsights}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <>
      {byDimension ? (
        <>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
            <EuiFlexItem>
              <EuiToolTip content={byDimension}>
                <EuiTitle size={getSubtitleSize()}>
                  <h4>
                    <EuiTextTruncate text={byDimension} truncation="middle" />
                  </h4>
                </EuiTitle>
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{actionIcons}</EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
        </>
      ) : (
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart" gutterSize="s">
          <EuiFlexItem>
            <EuiToolTip
              content={
                <div>
                  <strong>{title}</strong>
                  {metric.description && (
                    <>
                      <br />
                      {metric.description}
                    </>
                  )}
                </div>
              }
            >
              <EuiTitle size={getTitleSize()}>
                <h3 style={{ fontFamily: 'monospace' }}>
                  <EuiTextTruncate text={title} truncation="middle" />
                </h3>
              </EuiTitle>
            </EuiToolTip>
            {metric.description ? (
              <EuiText size={getDescriptionSize()} color="subdued">
                <p style={{ fontFamily: 'monospace' }}>
                  <EuiTextTruncate text={metric.description} truncation="end" />
                </p>
              </EuiText>
            ) : (
              <EuiSpacer size="m" />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{actionIcons}</EuiFlexItem>
        </EuiFlexGroup>
      )}

      <MetricInsightsFlyout
        metric={metric}
        esqlQuery={esqlQuery}
        isOpen={isFlyoutOpen}
        onClose={() => setIsFlyoutOpen(false)}
      />
    </>
  );
};
