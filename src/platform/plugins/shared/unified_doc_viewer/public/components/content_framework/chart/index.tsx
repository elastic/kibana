/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { getUnifiedDocViewerServices } from '../../../plugin';

export interface ContentFrameworkChartProps {
  title: string;
  description?: string;
  esqlQuery?: string;
  children: React.ReactNode;
  'data-test-subj': string;
}

export function ContentFrameworkChart({
  'data-test-subj': contentFrameworkChartDataTestSubj,
  title,
  description,
  esqlQuery,
  children,
}: ContentFrameworkChartProps) {
  const {
    share: {
      url: { locators },
    },
    data: {
      query: {
        timefilter: { timefilter },
      },
    },
  } = getUnifiedDocViewerServices();
  const discoverLocator = useMemo(() => locators.get(DISCOVER_APP_LOCATOR), [locators]);

  const discoverUrl = useMemo(() => {
    if (!discoverLocator) {
      return undefined;
    }

    const url = discoverLocator.getRedirectUrl({
      timeRange: timefilter.getAbsoluteTime(),
      filters: [],
      query: {
        esql: esqlQuery,
      },
    });

    return url;
  }, [discoverLocator, esqlQuery, timefilter]);

  const openInDiscoverButtonLabel = i18n.translate(
    'unifiedDocViewer.contentFramework.chart.openInDiscover',
    {
      defaultMessage: 'Open in Discover',
    }
  );

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      data-test-subj={contentFrameworkChartDataTestSubj}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <h3>{title}</h3>
                </EuiTitle>
              </EuiFlexItem>
              {description && (
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    content={description}
                    data-test-subj="ContentFrameworkChartDescription"
                    size="s"
                    color="subdued"
                    aria-label={description}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          {esqlQuery && discoverUrl && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="discoverApp"
                href={discoverUrl}
                aria-label={openInDiscoverButtonLabel}
                data-test-subj="ContentFrameworkChartOpenInDiscover"
                size="xs"
              >
                {openInDiscoverButtonLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={true}>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
