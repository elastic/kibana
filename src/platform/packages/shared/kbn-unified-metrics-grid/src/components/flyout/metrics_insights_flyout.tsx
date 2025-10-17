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
  useIsWithinMinBreakpoint,
  EuiButtonEmpty,
  EuiFlyoutFooter,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import { MetricFlyoutBody } from './metrics_flyout_body';
import { useFlyoutA11y } from './hooks/use_flyout_a11y';
import { useFieldsMetadataContext } from '../../context/fields_metadata';

interface MetricInsightsFlyoutProps {
  metric: MetricField;
  esqlQuery?: string;
  onClose: () => void;
}

export const MetricInsightsFlyout = ({ metric, esqlQuery, onClose }: MetricInsightsFlyoutProps) => {
  const isXlScreen = useIsWithinMinBreakpoint('xl');

  const { screenReaderDescription } = useFlyoutA11y({ isXlScreen });
  const { fieldsMetadata = {} } = useFieldsMetadataContext();

  return (
    <>
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
    </>
  );
};
