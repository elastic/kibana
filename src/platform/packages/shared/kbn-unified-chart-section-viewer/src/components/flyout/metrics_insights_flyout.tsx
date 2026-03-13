/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  isDOMNode,
  keys,
  useEuiTheme,
  useGeneratedHtmlId,
  useIsWithinMinBreakpoint,
} from '@elastic/eui';
import React, { useCallback, useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { DiscoverFlyouts, dismissAllFlyoutsExceptFor } from '@kbn/discover-utils';
import type { MetricField } from '../../types';
import { MetricFlyoutBody } from './metrics_flyout_body';
import { useFlyoutA11y } from './hooks/use_flyout_a11y';
import { useFieldsMetadataContext } from '../../context/fields_metadata';

interface MetricInsightsFlyoutProps {
  metric: MetricField;
  esqlQuery?: string;
  onClose: () => void;
}

export const MetricInsightsFlyout = ({ metric, esqlQuery, onClose }: MetricInsightsFlyoutProps) => {
  const { euiTheme } = useEuiTheme();
  const defaultWidth = euiTheme.base * 34;
  const isXlScreen = useIsWithinMinBreakpoint('xl');
  const [flyoutWidth, setFlyoutWidth] = useLocalStorage(
    'metricsExperience:flyoutWidth',
    defaultWidth
  );
  const flyoutWidthRef = useRef(flyoutWidth ?? defaultWidth);
  const { a11yProps, screenReaderDescription } = useFlyoutA11y({ isXlScreen });
  const { fieldsMetadata = {} } = useFieldsMetadataContext();

  useEffect(() => {
    dismissAllFlyoutsExceptFor(DiscoverFlyouts.metricInsights);
  }, []);

  const metricFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'metricFlyoutTitle',
  });

  const metricFlyoutTitle = i18n.translate('metricsExperience.metricInsightsFlyout.title', {
    defaultMessage: 'Metric',
  });

  // Only handle ESC in push mode (xl screen). In overlay mode, EUI handles ESC automatically.
  const onKeyDown = useCallback(
    (ev: React.KeyboardEvent) => {
      if (
        isXlScreen &&
        isDOMNode(ev.target) &&
        ev.currentTarget.contains(ev.target) &&
        ev.key === keys.ESCAPE
      ) {
        ev.preventDefault();
        ev.stopPropagation();
        onClose();
      }
    },
    [onClose, isXlScreen]
  );

  const minWidth = euiTheme.base * 24;
  const maxWidth = euiTheme.breakpoint.xl;

  return (
    <EuiFlyout
      session="start"
      flyoutMenuProps={{
        title: metricFlyoutTitle,
      }}
      onClose={onClose}
      type="push"
      pushMinBreakpoint="xl"
      size={flyoutWidthRef.current}
      data-test-subj="metricsExperienceFlyout"
      aria-labelledby={metricFlyoutTitleId}
      onKeyDown={onKeyDown}
      ownFocus
      minWidth={minWidth}
      maxWidth={maxWidth}
      resizable={true}
      onResize={setFlyoutWidth}
      css={{
        maxWidth: `${isXlScreen ? `calc(100vw - ${defaultWidth}px)` : '90vw'} !important`,
      }}
      paddingSize="m"
      {...a11yProps}
    >
      {screenReaderDescription}
      <EuiFlyoutHeader>
        <EuiTitle size="xs" data-test-subj="metricsExperienceFlyoutRowDetailsTitle">
          <h2 id={metricFlyoutTitleId}>{metricFlyoutTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <MetricFlyoutBody
          metric={metric}
          esqlQuery={esqlQuery}
          description={fieldsMetadata[metric.name]?.description}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
