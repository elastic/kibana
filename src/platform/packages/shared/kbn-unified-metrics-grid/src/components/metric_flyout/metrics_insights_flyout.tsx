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
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  useIsWithinMinBreakpoint,
  useEuiTheme,
  EuiButtonEmpty,
  EuiFlyoutFooter,
} from '@elastic/eui';
import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { MetricField } from '../../types';
import { MetricFlyoutContent } from './metric_flyout_content';

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
  const { euiTheme } = useEuiTheme();
  const DEFAULT_WIDTH = euiTheme.base * 34;
  const defaultWidth = DEFAULT_WIDTH; // Give enough room to search bar to not wrap
  const isXlScreen = useIsWithinMinBreakpoint('xl');
  const [flyoutWidth, setFlyoutWidth] = useLocalStorage(
    'metricInsightsFlyout:flyoutWidth',
    defaultWidth
  );
  if (!isOpen) return null;

  const minWidth = euiTheme.base * 24;
  const maxWidth = euiTheme.breakpoint.xl;

  return (
    <EuiFlyoutResizable
      onClose={onClose}
      type="push"
      size={flyoutWidth}
      pushMinBreakpoint="xl"
      data-test-subj="metricViewerFlyout"
      ownFocus={true}
      minWidth={minWidth}
      maxWidth={maxWidth}
      onResize={setFlyoutWidth}
      css={{
        maxWidth: `${isXlScreen ? `calc(100vw - ${DEFAULT_WIDTH}px)` : '90vw'} !important`,
      }}
      paddingSize="m"
      // TODO Add accessibility props
      // {...a11yProps}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="m">
              <strong>Metric</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <MetricFlyoutContent metric={metric} esqlQuery={esqlQuery} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty iconType="cross" onClick={onClose}>
          Close
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyoutResizable>
  );
};
