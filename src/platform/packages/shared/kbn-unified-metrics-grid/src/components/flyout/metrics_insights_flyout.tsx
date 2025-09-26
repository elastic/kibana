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
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  useIsWithinMinBreakpoint,
  useEuiTheme,
  EuiButtonEmpty,
  EuiFlyoutFooter,
  isDOMNode,
  keys,
  EuiTitle,
  EuiPortal,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { css } from '@emotion/react';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import { MetricFlyoutBody } from './metrics_flyout_body';
import { useFlyoutA11y } from './hooks/use_flyout_a11y';
import { useFieldsMetadataContext } from '../../context/fields_metadata';

interface MetricInsightsFlyoutProps {
  metric: MetricField;
  esqlQuery?: string;
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
  const defaultWidth = euiTheme.base * 34;
  const isXlScreen = useIsWithinMinBreakpoint('xl');
  const [flyoutWidth, setFlyoutWidth] = useLocalStorage(
    'metricsExperience:flyoutWidth',
    defaultWidth
  );
  const { a11yProps, screenReaderDescription } = useFlyoutA11y({ isXlScreen });
  const { fieldsMetadata = {} } = useFieldsMetadataContext();

  const onKeyDown = useCallback(
    (ev: React.KeyboardEvent) => {
      if (isDOMNode(ev.target) && ev.currentTarget.contains(ev.target) && ev.key === keys.ESCAPE) {
        ev.preventDefault();
        ev.stopPropagation();
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  const minWidth = euiTheme.base * 24;
  const maxWidth = euiTheme.breakpoint.xl;

  return (
    <EuiPortal>
      <EuiFlyoutResizable
        onClose={onClose}
        type="push"
        size={flyoutWidth}
        onKeyDown={onKeyDown}
        pushMinBreakpoint="xl"
        data-test-subj="metricsExperienceFlyout"
        aria-label={i18n.translate(
          'metricsExperience.metricInsightsFlyout.euiFlyoutResizable.metricInsightsFlyoutLabel',
          { defaultMessage: 'Metric Insights Flyout' }
        )}
        ownFocus
        minWidth={minWidth}
        maxWidth={maxWidth}
        onResize={setFlyoutWidth}
        css={{
          maxWidth: `${isXlScreen ? `calc(100vw - ${defaultWidth}px)` : '90vw'} !important`,
        }}
        paddingSize="m"
        {...a11yProps}
      >
        {screenReaderDescription}
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle
                size="xs"
                data-test-subj="metricsExperienceFlyoutRowDetailsTitle"
                css={css`
                  white-space: nowrap;
                `}
              >
                <h2>
                  {i18n.translate('metricsExperience.metricInsightsFlyout.strong.metricLabel', {
                    defaultMessage: 'Metric',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <MetricFlyoutBody
            metric={metric}
            esqlQuery={esqlQuery}
            description={fieldsMetadata[metric.name]?.description}
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiButtonEmpty
            iconType="cross"
            onClick={onClose}
            aria-label={i18n.translate('metricsExperience.metricInsightsFlyout.close.ariaLabel', {
              defaultMessage: 'Close metric insights flyout',
            })}
          >
            {i18n.translate('metricsExperience.metricInsightsFlyout.close.label', {
              defaultMessage: 'Close',
            })}
          </EuiButtonEmpty>
        </EuiFlyoutFooter>
      </EuiFlyoutResizable>
    </EuiPortal>
  );
};
